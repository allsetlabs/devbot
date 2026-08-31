/**
 * Auth routes — Google OAuth flow, session management, API token CRUD.
 *
 * All routes are mounted at /auth/* and are accessible without prior auth
 * (except token management endpoints, which require auth).
 */

import { Router } from 'express';
import { coreDb } from '../lib/db/core.js';
import { auth_sessions, auth_tokens } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import {
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from '../lib/auth/google-oauth.js';
import {
  generateSessionToken,
  generateApiToken,
  createOAuthState,
  verifyOAuthState,
  requireAuth,
  parseCookie,
} from '../lib/auth/middleware.js';
import { asyncHandler } from '../lib/route-helpers.js';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  ALLOWED_EMAIL,
  BACKEND_PORT,
  API_KEY,
} from '../lib/env.js';

export const authRouter = Router();

// ── Status ──────────────────────────────────────────────────────────

/**
 * GET /auth/status — Check if the current request is authenticated.
 * No auth required — used by the frontend on initial load.
 */
authRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    // 1. Check session cookie
    const sessionToken = parseCookie(
      req.headers.cookie ?? '',
      'devbot_session'
    );
    if (sessionToken) {
      const rows = coreDb
        .select()
        .from(auth_sessions)
        .where(eq(auth_sessions.token, sessionToken))
        .limit(1)
        .all();

      if (rows.length > 0) {
        const session = rows[0];
        const now = new Date().toISOString();
        if (!session.expires_at || session.expires_at > now) {
          res.json({
            authenticated: true,
            user: {
              email: session.email,
              name: session.name,
              picture: session.picture,
            },
          });
          return;
        }
      }
    }

    // 2. Check Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const rows = coreDb
        .select()
        .from(auth_tokens)
        .where(eq(auth_tokens.token, token))
        .limit(1)
        .all();

      if (rows.length > 0) {
        res.json({
          authenticated: true,
          user: {
            email: rows[0].email,
            name: rows[0].name || 'API',
            picture: '',
          },
        });
        return;
      }
    }

    // 3. Check legacy API key
    const providedKey =
      (req.headers['x-api-key'] as string) || (req.query.key as string);
    if (API_KEY && providedKey === API_KEY) {
      res.json({
        authenticated: true,
        user: { email: 'api-key', name: 'API Key User', picture: '' },
      });
      return;
    }

    // 4. If OAuth is not configured and no API_KEY → dev mode (auto-auth)
    if (!GOOGLE_CLIENT_ID && !API_KEY) {
      res.json({
        authenticated: true,
        user: { email: 'dev', name: 'Dev Mode', picture: '' },
      });
      return;
    }

    res.json({
      authenticated: false,
      oauthConfigured: !!GOOGLE_CLIENT_ID,
    });
  }, 'check auth status')
);

// ── Google OAuth Flow ───────────────────────────────────────────────

/**
 * GET /auth/google — Initiate Google OAuth flow.
 * Redirects the browser to Google's consent screen.
 */
authRouter.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(503).json({
      error: 'OAuth not configured',
      message:
        'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
    });
    return;
  }

  const protocol =
    (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.headers.host || `localhost:${BACKEND_PORT}`;
  const redirectUri = `${protocol}://${host}/auth/google/callback`;

  // Where to send the user after successful auth
  const appRedirect =
    (req.query.redirect as string) ||
    `${protocol}://${host.split(':')[0]}:4005`;
  const state = createOAuthState(appRedirect);

  const authUrl = getGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri, state);
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback — Handle Google OAuth callback.
 * Exchanges the code for tokens, verifies the user, creates a session.
 */
authRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      res.status(400).send(
        `<html><body><h2>Authentication Error</h2><p>${String(oauthError)}</p>` +
          `<a href="/">Go back</a></body></html>`
      );
      return;
    }

    if (
      !code ||
      !state ||
      typeof code !== 'string' ||
      typeof state !== 'string'
    ) {
      res.status(400).json({
        error: 'Bad request',
        message: 'Missing code or state parameter',
      });
      return;
    }

    // Verify CSRF state
    const stateData = verifyOAuthState(state);
    if (!stateData) {
      res.status(400).json({
        error: 'Invalid state',
        message:
          'OAuth state verification failed. The link may have expired — try signing in again.',
      });
      return;
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: 'OAuth not configured' });
      return;
    }

    const protocol =
      (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.headers.host || `localhost:${BACKEND_PORT}`;
    const redirectUri = `${protocol}://${host}/auth/google/callback`;

    // Exchange auth code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Get user profile
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Enforce email whitelist
    if (userInfo.email !== ALLOWED_EMAIL) {
      res.status(403).send(
        `<html><body>` +
          `<h2>Access Denied</h2>` +
          `<p>Email <strong>${userInfo.email}</strong> is not authorized.</p>` +
          `<p>Only <strong>${ALLOWED_EMAIL}</strong> can access DevBot.</p>` +
          `<a href="/">Go back</a>` +
          `</body></html>`
      );
      return;
    }

    // Create session (30-day expiry)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    coreDb
      .insert(auth_sessions)
      .values({
        token: sessionToken,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        expires_at: expiresAt,
        created_by: 'oauth',
        created_at: new Date().toISOString(),
        updated_by: 'oauth',
        updated_at: new Date().toISOString(),
      })
      .run();

    console.log(
      `[Auth] Session created for ${userInfo.email} (expires ${expiresAt})`
    );

    // Set session cookie
    const isSecure = protocol === 'https';
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    res.setHeader(
      'Set-Cookie',
      `devbot_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`
    );

    // Redirect to the frontend app
    res.redirect(stateData.redirect);
  }, 'Google OAuth callback')
);

// ── Logout ──────────────────────────────────────────────────────────

/**
 * POST /auth/logout — End the current session and clear the cookie.
 */
authRouter.post('/logout', (req, res) => {
  const sessionToken = parseCookie(
    req.headers.cookie ?? '',
    'devbot_session'
  );
  if (sessionToken) {
    coreDb
      .delete(auth_sessions)
      .where(eq(auth_sessions.token, sessionToken))
      .run();
    console.log('[Auth] Session destroyed');
  }

  res.setHeader(
    'Set-Cookie',
    'devbot_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  res.json({ success: true });
});

// ── API Token Management (requires auth) ────────────────────────────

/**
 * GET /auth/tokens — List all API tokens (masked).
 */
authRouter.get(
  '/tokens',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const tokens = coreDb
      .select({
        token: auth_tokens.token,
        name: auth_tokens.name,
        email: auth_tokens.email,
        created_at: auth_tokens.created_at,
        last_used_at: auth_tokens.last_used_at,
      })
      .from(auth_tokens)
      .all();

    // Mask tokens — show only last 8 chars
    const masked = tokens.map((t) => ({
      id: t.token.slice(-8),
      name: t.name,
      email: t.email,
      createdAt: t.created_at,
      lastUsedAt: t.last_used_at,
      tokenPreview: `${'•'.repeat(56)}${t.token.slice(-8)}`,
    }));

    res.json(masked);
  }, 'list API tokens')
);

/**
 * POST /auth/tokens — Create a new API token.
 * Returns the full token only on creation (never shown again).
 */
authRouter.post(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = (req as unknown as { user: { email: string } }).user;
    const name = (req.body?.name as string) || 'API Token';
    const token = generateApiToken();
    const now = new Date().toISOString();

    coreDb
      .insert(auth_tokens)
      .values({
        token,
        name,
        email: user.email,
        created_by: 'user',
        created_at: now,
        updated_by: 'user',
        updated_at: now,
      })
      .run();

    console.log(`[Auth] API token created: ${name}`);
    res.json({ token, name, createdAt: now });
  }, 'create API token')
);

/**
 * DELETE /auth/tokens/:id — Revoke an API token by its last-8-char ID.
 */
authRouter.delete(
  '/tokens/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const preview = String(req.params.id);
    const allTokens = coreDb.select().from(auth_tokens).all();
    const match = allTokens.find((t) => t.token.endsWith(preview));

    if (!match) {
      res.status(404).json({ error: 'Not found', message: 'Token not found' });
      return;
    }

    coreDb
      .delete(auth_tokens)
      .where(eq(auth_tokens.token, match.token))
      .run();

    console.log(`[Auth] API token revoked: ${match.name}`);
    res.json({ success: true });
  }, 'revoke API token')
);
