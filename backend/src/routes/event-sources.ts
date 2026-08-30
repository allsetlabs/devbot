import { Router } from 'express';
import { eq, desc, ne, and } from 'drizzle-orm';
import { coreDb, event_sources, event_task_links, scheduled_tasks } from '../lib/db/core.js';
import {
  asyncHandler,
  sendNotFound,
  sendBadRequest,
  requireString,
  validateOptionalString,
  generateId,
  requireEnum,
} from '../lib/route-helpers.js';
import type { EventSourceRow, EventTaskLinkRow } from '../lib/db/types.js';
import { evaluateEventSource } from '../lib/event-worker.js';

const router = Router();

const VALID_TYPES = ['stock', 'news', 'weather', 'webhook', 'cron', 'file_watch', 'custom'] as const;
type EventSourceType = (typeof VALID_TYPES)[number];

const VALID_STATUSES = ['active', 'paused'] as const;

// ============================================
// Response Mapping
// ============================================

interface EventSource {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  status: 'active' | 'paused' | 'deleted';
  pollIntervalSeconds: number;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  linkedTaskIds: string[];
}

interface EventTaskLink {
  id: string;
  eventSourceId: string;
  taskId: string;
  condition: Record<string, unknown>;
  createdAt: string;
}

function rowToEventSource(row: EventSourceRow, links: EventTaskLinkRow[] = []): EventSource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: (row.config as Record<string, unknown>) || {},
    status: row.status as 'active' | 'paused' | 'deleted',
    pollIntervalSeconds: row.poll_interval_seconds,
    lastCheckedAt: row.last_checked_at,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    linkedTaskIds: links.map((l) => l.task_id),
  };
}

function rowToLink(row: EventTaskLinkRow): EventTaskLink {
  return {
    id: row.id,
    eventSourceId: row.event_source_id,
    taskId: row.task_id,
    condition: (row.condition as Record<string, unknown>) || {},
    createdAt: row.created_at,
  };
}

// ============================================
// Event Source CRUD
// ============================================

// List all non-deleted event sources with linked task IDs
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(event_sources)
      .where(ne(event_sources.status, 'deleted'))
      .orderBy(desc(event_sources.created_at));

    const allLinks = await coreDb
      .select()
      .from(event_task_links);

    const linksBySourceId = new Map<string, EventTaskLinkRow[]>();
    for (const link of allLinks) {
      const existing = linksBySourceId.get(link.event_source_id) || [];
      existing.push(link);
      linksBySourceId.set(link.event_source_id, existing);
    }

    res.json(rows.map((row) => rowToEventSource(row, linksBySourceId.get(row.id) || [])));
  }, 'list event sources')
);

// Get single event source with linked tasks
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(event_sources)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    const links = await coreDb
      .select()
      .from(event_task_links)
      .where(eq(event_task_links.event_source_id, req.params.id));

    res.json(rowToEventSource(rows[0], links));
  }, 'get event source')
);

// Create event source
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, type, config, pollIntervalSeconds, status } = req.body;

    if (!requireString(res, name, 'Name')) return;
    if (!requireString(res, type, 'Type')) return;

    if (!VALID_TYPES.includes(type as EventSourceType)) {
      sendBadRequest(res, `Type must be one of: ${VALID_TYPES.join(', ')}`);
      return;
    }

    if (status !== undefined) {
      if (!requireEnum(res, status, VALID_STATUSES, 'status')) return;
    }

    if (pollIntervalSeconds !== undefined) {
      if (typeof pollIntervalSeconds !== 'number' || pollIntervalSeconds < 1) {
        sendBadRequest(res, 'pollIntervalSeconds must be a positive number');
        return;
      }
    }

    const id = generateId();
    const result = await coreDb
      .insert(event_sources)
      .values({
        id,
        name: name.trim(),
        type: type as EventSourceType,
        config: config || {},
        status: status || 'active',
        poll_interval_seconds: pollIntervalSeconds || 300,
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to create event source');
    }

    res.status(201).json(rowToEventSource(result[0]));
  }, 'create event source')
);

// Update event source
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { name, type, config, pollIntervalSeconds, status } = req.body;

    const existing = await coreDb
      .select()
      .from(event_sources)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .limit(1);

    if (!existing || existing.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    const updates: Partial<typeof event_sources.$inferInsert> = { updated_by: 'user' };

    if (name !== undefined) {
      if (!validateOptionalString(res, name, 'name')) return;
      updates.name = name.trim();
    }

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type as EventSourceType)) {
        sendBadRequest(res, `Type must be one of: ${VALID_TYPES.join(', ')}`);
        return;
      }
      updates.type = type as EventSourceType;
    }

    if (config !== undefined) {
      updates.config = config;
    }

    if (pollIntervalSeconds !== undefined) {
      if (typeof pollIntervalSeconds !== 'number' || pollIntervalSeconds < 1) {
        sendBadRequest(res, 'pollIntervalSeconds must be a positive number');
        return;
      }
      updates.poll_interval_seconds = pollIntervalSeconds;
    }

    if (status !== undefined) {
      if (!requireEnum(res, status, VALID_STATUSES, 'status')) return;
      updates.status = status;
    }

    if (Object.keys(updates).length === 1 && updates.updated_by) {
      sendBadRequest(res, 'No valid updates provided');
      return;
    }

    const result = await coreDb
      .update(event_sources)
      .set(updates)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    const links = await coreDb
      .select()
      .from(event_task_links)
      .where(eq(event_task_links.event_source_id, req.params.id));

    res.json(rowToEventSource(result[0], links));
  }, 'update event source')
);

// Soft delete event source
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(event_sources)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    await coreDb
      .update(event_sources)
      .set({ status: 'deleted', updated_by: 'user' })
      .where(eq(event_sources.id, req.params.id));

    res.json({ success: true });
  }, 'delete event source')
);

// ============================================
// Test evaluator (dry-run)
// ============================================

// Test an event source's evaluator without triggering linked tasks
router.post(
  '/:id/test',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(event_sources)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    const source = rows[0];
    const result = await evaluateEventSource(source);

    res.json(result);
  }, 'test event source evaluator')
);

// ============================================
// Task Linking
// ============================================

// Link a task to an event source
router.post(
  '/:id/link-task',
  asyncHandler(async (req, res) => {
    const { taskId, condition } = req.body;

    if (!requireString(res, taskId, 'taskId')) return;

    const sourceRows = await coreDb
      .select()
      .from(event_sources)
      .where(and(eq(event_sources.id, req.params.id), ne(event_sources.status, 'deleted')))
      .limit(1);

    if (!sourceRows || sourceRows.length === 0) {
      sendNotFound(res, 'Event source');
      return;
    }

    const taskRows = await coreDb
      .select()
      .from(scheduled_tasks)
      .where(and(eq(scheduled_tasks.id, taskId), ne(scheduled_tasks.status, 'deleted')))
      .limit(1);

    if (!taskRows || taskRows.length === 0) {
      sendNotFound(res, 'Task');
      return;
    }

    const id = generateId();
    const result = await coreDb
      .insert(event_task_links)
      .values({
        id,
        event_source_id: req.params.id,
        task_id: taskId,
        condition: condition || {},
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to create task link');
    }

    res.status(201).json(rowToLink(result[0]));
  }, 'link task to event source')
);

// Remove a task link
router.delete(
  '/:id/link-task/:linkId',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(event_task_links)
      .where(
        and(
          eq(event_task_links.id, req.params.linkId),
          eq(event_task_links.event_source_id, req.params.id)
        )
      )
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Task link');
      return;
    }

    await coreDb
      .delete(event_task_links)
      .where(eq(event_task_links.id, req.params.linkId));

    res.json({ success: true });
  }, 'remove task link')
);

export { router as eventSourcesRouter };
