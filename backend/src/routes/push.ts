/**
 * Push notification routes.
 *
 * POST /register    — register a device push token
 * POST /unregister  — remove a device push token
 * GET  /tokens      — list registered tokens (masked)
 * POST /test        — send a test push notification to all devices
 */

import { Router } from 'express';
import {
  registerPushToken,
  unregisterPushToken,
  listPushTokens,
  sendPushNotification,
} from '../lib/push-service.js';

export const pushRouter = Router();

// Register a device push token
pushRouter.post('/register', async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Missing or invalid token' });
      return;
    }

    if (!platform || !['android', 'ios', 'web'].includes(platform)) {
      res.status(400).json({ error: 'Platform must be android, ios, or web' });
      return;
    }

    await registerPushToken(token, platform, deviceName);
    res.json({ success: true });
  } catch (err) {
    console.error('[Push] Register error:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Unregister a device push token
pushRouter.post('/unregister', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Missing or invalid token' });
      return;
    }

    const removed = await unregisterPushToken(token);
    res.json({ success: true, removed });
  } catch (err) {
    console.error('[Push] Unregister error:', err);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

// List registered tokens (masked for security)
pushRouter.get('/tokens', async (_req, res) => {
  try {
    const tokens = await listPushTokens();
    const masked = tokens.map((t) => ({
      id: t.id,
      tokenPreview: `${t.token.slice(0, 8)}...${t.token.slice(-4)}`,
      platform: t.platform,
      deviceName: t.device_name,
      lastUsedAt: t.last_used_at,
      createdAt: t.created_at,
    }));
    res.json(masked);
  } catch (err) {
    console.error('[Push] List tokens error:', err);
    res.status(500).json({ error: 'Failed to list push tokens' });
  }
});

// Send a test push notification
pushRouter.post('/test', async (_req, res) => {
  try {
    await sendPushNotification(
      'DevBot Test 🔔',
      'Push notifications are working!',
      { type: 'test' }
    );
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    console.error('[Push] Test send error:', err);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});
