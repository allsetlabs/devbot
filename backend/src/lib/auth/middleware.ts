/**
 * Authentication middleware.
 *
 * Supports three auth methods (checked in order):
 * 1. Session cookie (devbot_session) — set via Google OAuth flow
 * 2. Bearer token (Authorization header) — for mobile/programmatic access
 * 3. X-API-Key header — backward compatibility with existing API key auth
 *
 * If Google OAuth is not configured (no GOOGLE_CLIENT_ID), falls back to
 * API key-only auth, preserving current behavior.
 */

import { randomBytes, createHmac } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { coreDb } from '../db/core.js';
import { auth_sessions, auth_tokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { API_KEY, SESSION_SECRET, GOOGLE_CLIENT_ID } from '../env.js';

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  authMethod: 'session' | 'token' | 'api_key';
}

/** Generate a cryptographically random session token. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/** Generate a cryptographically random API token. */
export function generateApiToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a signed OAuth state parameter for CSRF protection.
 * Format: base64url(payload)|hmac
 */
export function createOAuthState(redirectUrl: string): string {
  const payload = JSON.stringify({
    redirect: redirectUrl,
    ts: Date.now(),
    nonce: randomBytes(8).toString('hex'),
  });
  const encoded = Buffer.from(payload).toString('base64url');
  const hmac = createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('hex');
  return `${encoded}|${hmac}`;
}

/**
 * Verify and decode an OAuth state parameter.
 * Returns null if invalid, expired (>10 min), or tampered.
 */
export function verifyOAuthState(
  state: string
): { redirect: string; ts: number } | null {
  const parts = state.split('|');
  if (parts.length !== 2) return null;
  const [encoded, hmac] = parts;

  const expectedHmac = createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('hex');
  if (hmac !== expectedHmac) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString()
    );
    // Reject states older than 10 minutes
    if (Date.now() - payload.ts > 10 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Parse a specific cookie value from a Cookie header string. */
export function parseCookie(
  cookieHeader: string,
  name: string
): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Look up a valid (non-expired) session by token.
 * Deletes expired sessions on read.
 */
function getSessionByToken(token: string) {
  const rows = coreDb
    .select()
    .from(auth_sessions)
    .where(eq(auth_sessions.token, token))
    .limit(1)
    .all();

  if (rows.length === 0) return null;
  const session = rows[0];

  // Check expiration
  const now = new Date().toISOString();
  if (session.expires_at && session.expires_at < now) {
    coreDb
      .delete(auth_sessions)
      .where(eq(auth_sessions.token, token))
      .run();
    return null;
  }

  return session;
}

/** Look up an API token by value. */
function getApiTokenByValue(token: string) {
  const rows = coreDb
    .select()
    .from(auth_tokens)
    .where(eq(auth_tokens.token, token))
    .limit(1)
    .all();

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Authentication middleware.
 *
 * When OAuth is configured: checks session cookie → Bearer token → API key.
 * When OAuth is NOT configured: checks API key only (current behavior).
 * When neither is configured: auth disabled (dev mode).
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If Google OAuth is not configured, fall back to API key auth
  if (!GOOGLE_CLIENT_ID) {
    if (API_KEY) {
      const providedKey =
        req.headers['x-api-key'] || req.query.key;
      if (providedKey !== API_KEY) {
        res
          .status(401)
          .json({ error: 'Unauthorized', message: 'Invalid API key' });
        return;
      }
    }
    // No OAuth, no API key → auth disabled (dev mode)
    next();
    return;
  }

  // 1. Check session cookie
  const sessionToken = parseCookie(
    req.headers.cookie ?? '',
    'devbot_session'
  );
  if (sessionToken) {
    const session = getSessionByToken(sessionToken);
    if (session) {
      (req as Request & { user: AuthUser }).user = {
        email: session.email,
        name: session.name,
        picture: session.picture,
        authMethod: 'session',
      };
      next();
      return;
    }
  }

  // 2. Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const apiToken = getApiTokenByValue(token);
    if (apiToken) {
      // Update last_used_at
      coreDb
        .update(auth_tokens)
        .set({ last_used_at: new Date().toISOString() })
        .where(eq(auth_tokens.token, token))
        .run();

      (req as Request & { user: AuthUser }).user = {
        email: apiToken.email,
        name: apiToken.name || 'API',
        picture: '',
        authMethod: 'token',
      };
      next();
      return;
    }
  }

  // 3. Check X-API-Key (backward compatibility)
  if (API_KEY) {
    const providedKey =
      req.headers['x-api-key'] || req.query.key;
    if (providedKey === API_KEY) {
      (req as Request & { user: AuthUser }).user = {
        email: 'api-key',
        name: 'API Key',
        picture: '',
        authMethod: 'api_key',
      };
      next();
      return;
    }
  }

  res
    .status(401)
    .json({ error: 'Unauthorized', message: 'Authentication required' });
}
