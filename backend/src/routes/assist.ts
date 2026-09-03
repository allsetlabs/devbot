/**
 * Personal Assistant Mode routes.
 *
 * Lets any running terminal / Claude session request human attention.
 * The user sees the request on their phone, replies, and the terminal
 * receives the reply via a long-poll endpoint.
 *
 * POST   /request             — create a new assist request (terminal → human)
 * GET    /                    — list assist requests (query: status, source, limit)
 * GET    /pending-count       — count of pending requests
 * GET    /:id                 — get a single assist request
 * GET    /:id/wait            — long-poll: blocks until reply arrives or timeout
 * POST   /:id/reply           — user replies to a request (human → terminal)
 * POST   /:id/cancel          — cancel a pending request
 * DELETE /:id                 — delete a request
 */

import { Router } from 'express';
import {
  assistRequestStore,
  waitForReply,
  notifyWaiters,
  cancelWaiters,
  type AssistRequestSource,
  type AssistRequestStatus,
} from '../lib/stores/assist-requests.js';
import { sendNotification } from '../lib/notification-service.js';
import { asyncHandler, sendBadRequest, sendNotFound } from '../lib/route-helpers.js';

export const assistRouter = Router();

const VALID_SOURCES: AssistRequestSource[] = ['terminal', 'scheduler', 'chat', 'plugin', 'system'];
const VALID_STATUSES: AssistRequestStatus[] = ['pending', 'replied', 'expired', 'cancelled'];

const SOURCE_LABELS: Record<AssistRequestSource, string> = {
  terminal: '🖥️ Terminal',
  scheduler: '⏰ Scheduler',
  chat: '💬 Chat',
  plugin: '🧩 Plugin',
  system: '⚙️ System',
};

// ─── Create assist request ──────────────────────────────────────────────

assistRouter.post(
  '/request',
  asyncHandler(async (req, res) => {
    const {
      question,
      context,
      source = 'terminal',
      sourceId,
      sourceLabel,
      ttlSeconds = 0,
      notify = true,
    } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return sendBadRequest(res, 'question is required');
    }

    const validSource: AssistRequestSource = VALID_SOURCES.includes(source) ? source : 'terminal';

    const record = await assistRequestStore.create({
      question: question.trim(),
      context: context || null,
      source: validSource,
      sourceId: sourceId || null,
      sourceLabel: sourceLabel || null,
      status: 'pending',
      reply: null,
      repliedAt: null,
      ttlSeconds: typeof ttlSeconds === 'number' ? ttlSeconds : 0,
      notified: false,
      created_by: validSource,
      updated_by: validSource,
      settings: {},
    });

    // Send push notification + TTS
    if (notify !== false) {
      const srcLabel = SOURCE_LABELS[validSource] || validSource;
      const title = `${srcLabel} needs your input`;
      const body = question.length > 120 ? question.slice(0, 120) + '…' : question;

      sendNotification({
        title,
        body,
        category: 'assist',
        priority: 'high',
        speak: true,
        ttsText: `Attention needed. ${sourceLabel || srcLabel} is asking: ${question.slice(0, 100)}`,
        actionUrl: `/assist`,
        metadata: { assistRequestId: record.id, source: validSource, sourceId },
        source: 'assist',
      })
        .then(async () => {
          await assistRequestStore.update(record.id, { notified: true });
        })
        .catch((err) => {
          console.error('[Assist] Failed to send notification:', err);
        });
    }

    console.log(`[Assist] 🆘 New request from ${validSource}: "${question.slice(0, 60)}…" (${record.id})`);
    res.status(201).json(record);
  }, 'create assist request')
);

// ─── List requests ──────────────────────────────────────────────────────

assistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, source, limit, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status as AssistRequestStatus)) {
      filter.status = status;
    }
    if (source && VALID_SOURCES.includes(source as AssistRequestSource)) {
      filter.source = source;
    }

    const requests = await assistRequestStore.list({
      filter: Object.keys(filter).length > 0 ? filter : undefined,
      sort: 'created_at',
      order: 'desc',
      limit: limit ? parseInt(String(limit), 10) : 50,
      search: search ? String(search) : undefined,
    });

    res.json(requests);
  }, 'list assist requests')
);

// ─── Pending count ──────────────────────────────────────────────────────

assistRouter.get(
  '/pending-count',
  asyncHandler(async (_req, res) => {
    const pending = await assistRequestStore.list({ filter: { status: 'pending' } });
    res.json({ count: pending.length });
  }, 'get pending assist count')
);

// ─── Get single request ─────────────────────────────────────────────────

assistRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await assistRequestStore.get(req.params.id);
    if (!record) {
      return sendNotFound(res, 'assist request');
    }
    res.json(record);
  }, 'get assist request')
);

// ─── Long-poll wait for reply ───────────────────────────────────────────

assistRouter.get(
  '/:id/wait',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const timeoutMs = Math.min(
      parseInt(String(req.query.timeout || '30000'), 10),
      120_000 // Max 2 minutes
    );

    const record = await assistRequestStore.get(id);
    if (!record) {
      sendNotFound(res, 'assist request');
      return;
    }

    // Already replied — return immediately
    if (record.status === 'replied' && record.reply !== null) {
      res.json({ status: 'replied', reply: record.reply });
      return;
    }

    // Already cancelled or expired
    if (record.status === 'cancelled') {
      res.json({ status: 'cancelled', reply: null });
      return;
    }
    if (record.status === 'expired') {
      res.json({ status: 'expired', reply: null });
      return;
    }

    // Wait for reply
    try {
      const reply = await waitForReply(id, timeoutMs);
      res.json({ status: 'replied', reply });
    } catch (err) {
      if (err instanceof Error && err.message === 'timeout') {
        res.json({ status: 'pending', reply: null });
      } else if (err instanceof Error && err.message === 'cancelled') {
        res.json({ status: 'cancelled', reply: null });
      } else {
        throw err;
      }
    }
  }, 'wait for assist reply')
);

// ─── Reply to a request ─────────────────────────────────────────────────

assistRouter.post(
  '/:id/reply',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      return sendBadRequest(res, 'reply is required');
    }

    const record = await assistRequestStore.get(id);
    if (!record) {
      return sendNotFound(res, 'assist request');
    }

    if (record.status !== 'pending') {
      return sendBadRequest(res, `Cannot reply to a ${record.status} request`);
    }

    const updated = await assistRequestStore.update(id, {
      reply: reply.trim(),
      status: 'replied',
      repliedAt: new Date().toISOString(),
      updated_by: 'user',
    });

    // Wake up any long-poll waiters
    notifyWaiters(id, reply.trim());

    console.log(`[Assist] ✅ Reply sent for ${id}: "${reply.trim().slice(0, 60)}…"`);
    res.json(updated);
  }, 'reply to assist request')
);

// ─── Cancel a request ───────────────────────────────────────────────────

assistRouter.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const record = await assistRequestStore.get(id);
    if (!record) {
      return sendNotFound(res, 'assist request');
    }

    if (record.status !== 'pending') {
      return sendBadRequest(res, `Cannot cancel a ${record.status} request`);
    }

    const updated = await assistRequestStore.update(id, {
      status: 'cancelled',
      updated_by: 'user',
    });

    // Wake up any long-poll waiters with cancellation
    cancelWaiters(id);

    console.log(`[Assist] ❌ Request cancelled: ${id}`);
    res.json(updated);
  }, 'cancel assist request')
);

// ─── Delete a request ───────────────────────────────────────────────────

assistRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      // Cancel any waiters before deleting
      cancelWaiters(id);
      await assistRequestStore.delete(id);
      res.json({ success: true });
    } catch {
      return sendNotFound(res, 'assist request');
    }
  }, 'delete assist request')
);
