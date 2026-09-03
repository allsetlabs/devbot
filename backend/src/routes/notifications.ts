/**
 * Notification Service routes.
 *
 * GET    /                    — list notifications (query: category, priority, read, limit, offset)
 * GET    /unread-count        — get unread count
 * GET    /settings            — get notification settings
 * PUT    /settings            — update notification settings
 * POST   /send                — send a notification (manual / test)
 * POST   /:id/read            — mark a notification as read
 * POST   /mark-all-read       — mark all notifications as read
 * DELETE /:id                 — delete a notification
 * GET    /tts/:filename       — stream TTS audio file
 * POST   /test-tts            — test TTS synthesis (generate + return audio)
 */

import { Router } from 'express';
import fs from 'fs';
import {
  notificationStore,
  sendNotification,
  markNotificationRead,
  markAllRead,
  getUnreadCount,
  getNotificationSettings,
  updateNotificationSettings,
  getTtsAudioPath,
  type NotificationCategory,
  type NotificationPriority,
} from '../lib/notification-service.js';
import { asyncHandler, sendBadRequest, sendNotFound } from '../lib/route-helpers.js';

export const notificationsRouter = Router();

const VALID_CATEGORIES: NotificationCategory[] = ['scheduler', 'event', 'chat', 'assist', 'system', 'reminder', 'custom'];
const VALID_PRIORITIES: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

// ─── List notifications ─────────────────────────────────────────────────

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, priority, read, limit, offset, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (category && VALID_CATEGORIES.includes(category as NotificationCategory)) {
      filter.category = category;
    }
    if (priority && VALID_PRIORITIES.includes(priority as NotificationPriority)) {
      filter.priority = priority;
    }
    if (read !== undefined) {
      filter.read = read === 'true';
    }

    const notifications = await notificationStore.list({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: 'created_at',
      order: 'desc',
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : undefined,
      search: search ? String(search) : undefined,
    });

    res.json(notifications);
  }, 'list notifications')
);

// ─── Unread count ───────────────────────────────────────────────────────

notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (_req, res) => {
    const count = await getUnreadCount();
    res.json({ count });
  }, 'get unread count')
);

// ─── Settings ───────────────────────────────────────────────────────────

notificationsRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const settings = getNotificationSettings();
    res.json(settings);
  }, 'get notification settings')
);

notificationsRouter.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const updates = req.body;
    const settings = updateNotificationSettings(updates);
    res.json(settings);
  }, 'update notification settings')
);

// ─── Send notification ──────────────────────────────────────────────────

notificationsRouter.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { title, body, category, priority, speak, ttsText, actionUrl, metadata, source } = req.body;

    if (!title || typeof title !== 'string') {
      return sendBadRequest(res, 'title is required');
    }
    if (!body || typeof body !== 'string') {
      return sendBadRequest(res, 'body is required');
    }

    const record = await sendNotification({
      title,
      body,
      category: VALID_CATEGORIES.includes(category) ? category : 'custom',
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'normal',
      speak: speak !== false,
      ttsText,
      actionUrl,
      metadata,
      source: source || 'manual',
    });

    res.json(record);
  }, 'send notification')
);

// ─── Mark as read ───────────────────────────────────────────────────────

notificationsRouter.post(
  '/mark-all-read',
  asyncHandler(async (_req, res) => {
    const count = await markAllRead();
    res.json({ success: true, count });
  }, 'mark all notifications read')
);

notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const record = await markNotificationRead(req.params.id);
    if (!record) {
      return sendNotFound(res, 'notification');
    }
    res.json(record);
  }, 'mark notification read')
);

// ─── Delete notification ────────────────────────────────────────────────

notificationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      await notificationStore.delete(req.params.id);
      res.json({ success: true });
    } catch {
      return sendNotFound(res, 'notification');
    }
  }, 'delete notification')
);

// ─── TTS audio streaming ────────────────────────────────────────────────

notificationsRouter.get(
  '/tts/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Security: only allow filenames that match our pattern
    if (!/^notif-\d+\.mp3$/.test(filename)) {
      return sendBadRequest(res, 'Invalid filename');
    }

    const filePath = getTtsAudioPath(filename);
    if (!fs.existsSync(filePath)) {
      return sendNotFound(res, 'TTS audio file');
    }

    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }, 'stream TTS audio')
);

// ─── Test TTS ───────────────────────────────────────────────────────────

notificationsRouter.post(
  '/test-tts',
  asyncHandler(async (req, res) => {
    const { text } = req.body;
    const testText = text || 'This is a test notification from DevBot.';

    const record = await sendNotification({
      title: 'TTS Test 🔊',
      body: testText,
      category: 'system',
      priority: 'low',
      speak: true,
      ttsText: testText,
      source: 'test',
      silent: true, // Don't push, just generate TTS
    });

    res.json({
      success: true,
      notification: record,
      ttsAudioUrl: record.ttsAudioFile ? `/api/notifications/tts/${record.ttsAudioFile}` : null,
    });
  }, 'test TTS notification')
);
