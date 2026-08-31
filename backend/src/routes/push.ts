/**
 * Push Notification Routes
 *
 * Manages device push token registration for native mobile apps (Capacitor).
 * Tokens are stored in the core DB and used to send push notifications
 * when events occur (task completion, new messages, etc.).
 */

import { Router } from 'express';
import {
  registerPushToken,
  unregisterPushToken,
  listPushTokens,
  sendPushNotification,
} from '../lib/push-service.js';

export const pushRouter = Router();

/**
 * POST /api/push/register
 * Register a device push token.
 * Body: { token: string, platform: 'android' | 'ios' | 'web', deviceName?: string }
 */
pushRouter.post('/register', (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Missing or invalid token' });
      return;
    }
    if (!platform || !['android', 'ios', 'web'].includes(platform)) {
      res.status(400).json({ error: 'Missing or invalid platform (android, ios, web)' });
      return;
    }

    const record = registerPushToken(token, platform, deviceName || 'Unknown Device');
    res.json({ success: true, id: record.id });
  } catch (err) {
    console.error('[Push] Register error:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * POST /api/push/unregister
 * Unregister a device push token.
 * Body: { token: string }
 */
pushRouter.post('/unregister', (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Missing or invalid token' });
      return;
    }

    const removed = unregisterPushToken(token);
    res.json({ success: removed });
  } catch (err) {
    console.error('[Push] Unregister error:', err);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

/**
 * GET /api/push/tokens
 * List all registered push tokens (for admin/settings UI).
 */
pushRouter.get('/tokens', (_req, res) => {
  try {
    const tokens = listPushTokens();
    res.json(
      tokens.map((t) => ({
        id: t.id,
        platform: t.platform,
        deviceName: t.deviceName,
        createdAt: t.createdAt,
        lastUsedAt: t.lastUsedAt,
        // Don't expose the full token — show only a preview
        tokenPreview: t.token.slice(0, 12) + '...' + t.token.slice(-8),
      }))
    );
  } catch (err) {
    console.error('[Push] List tokens error:', err);
    res.status(500).json({ error: 'Failed to list push tokens' });
  }
});

/**
 * POST /api/push/test
 * Send a test push notification to all registered devices.
 * Body: { title: string, body: string }
 */
pushRouter.post('/test', async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      res.status(400).json({ error: 'Missing title or body' });
      return;
    }

    const sent = await sendPushNotification({ title, body });
    res.json({ success: true, sent });
  } catch (err) {
    console.error('[Push] Test notification error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});
