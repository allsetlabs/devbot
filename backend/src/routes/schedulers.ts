import { Router } from 'express';
import { eq, desc, ne, gt, and, isNull } from 'drizzle-orm';
import {
  coreDb,
  scheduled_tasks,
  task_runs,
  task_messages,
  chat_messages,
} from '../lib/db/core.js';
import type {
  ScheduledTaskRow,
  TaskRunRow,
  TaskMessageRow,
  SchedulerSettings,
} from '../lib/db/types.js';
import { isTaskExecuting, isTaskQueued, enqueueTask } from '../lib/scheduler-worker.js';
import {
  asyncHandler,
  sendNotFound,
  sendBadRequest,
  requireString,
  validateOptionalString,
  generateId,
  getOneById,
  requireEnum,
} from '../lib/route-helpers.js';
import { generateName } from '../lib/generate-name.js';

const router = Router();

export interface ScheduledTask {
  id: string;
  prompt: string;
  name: string | null;
  intervalMinutes: number;
  status: 'active' | 'paused' | 'deleted';
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  maxRuns: number | null;
  isRunning: boolean;
  isQueued: boolean;
  model: string;
  isSystem: boolean;
}

export interface TaskRun {
  id: string;
  taskId: string;
  runIndex: number;
  chatId: string | null;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'completed' | 'failed';
  outputFile: string | null;
  errorMessage: string | null;
}

export interface TaskMessage {
  id: string;
  runId: string;
  sequence: number;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system';
  content: Record<string, unknown>;
  createdAt: string;
}

function rowToTask(row: ScheduledTaskRow): ScheduledTask {
  return {
    id: row.id,
    prompt: row.prompt,
    name: row.name,
    intervalMinutes: row.interval_minutes,
    status: row.status,
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    runCount: row.run_count,
    maxRuns: row.max_runs,
    isRunning: isTaskExecuting(row.id),
    isQueued: isTaskQueued(row.id),
    model: (row.settings as SchedulerSettings | null | undefined)?.model || 'sonnet',
    isSystem: (row.settings as SchedulerSettings | null | undefined)?.isSystem === true,
  };
}

function rowToRun(row: TaskRunRow): TaskRun {
  return {
    id: row.id,
    taskId: row.task_id,
    runIndex: row.run_index,
    chatId: row.chat_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    outputFile: row.output_file,
    errorMessage: row.error_message,
  };
}

function rowToMessage(row: TaskMessageRow): TaskMessage {
  return {
    id: row.id,
    runId: row.run_id,
    sequence: row.sequence,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

// List all scheduled tasks
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select()
      .from(scheduled_tasks)
      .where(ne(scheduled_tasks.status, 'deleted'))
      .orderBy(desc(scheduled_tasks.created_at));

    res.json(rows.map(rowToTask));
  }, 'list tasks')
);

// Migrate existing schedulers without names
router.post(
  '/migrate-names',
  asyncHandler(async (_req, res) => {
    const rows = await coreDb
      .select({ id: scheduled_tasks.id, prompt: scheduled_tasks.prompt })
      .from(scheduled_tasks)
      .where(and(isNull(scheduled_tasks.name), ne(scheduled_tasks.status, 'deleted')));

    res.json({ message: `Generating names for ${rows.length} schedulers`, count: rows.length });

    for (const task of rows) {
      generateName(task.prompt)
        .then(async (generatedName) => {
          if (generatedName) {
            await coreDb
              .update(scheduled_tasks)
              .set({ name: generatedName, updated_by: 'system' })
              .where(eq(scheduled_tasks.id, task.id));
            console.log(`[Schedulers] Migration: named task ${task.id}: "${generatedName}"`);
          }
        })
        .catch((err) => console.error(`[Schedulers] Migration naming failed for ${task.id}:`, err));
    }
  }, 'migrate names')
);

// Get single scheduled task
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await getOneById(coreDb, scheduled_tasks, req.params.id, 'Task', res);
    if (!row) return;
    res.json(rowToTask(row));
  }, 'get task')
);

// Create new scheduled task
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { prompt, intervalMinutes, maxRuns, name, workingDir, model } = req.body;

    if (!requireString(res, prompt, 'Prompt')) return;

    if (!intervalMinutes || typeof intervalMinutes !== 'number' || intervalMinutes < 1) {
      sendBadRequest(res, 'Valid interval in minutes is required');
      return;
    }

    if (maxRuns !== undefined && maxRuns !== null) {
      if (typeof maxRuns !== 'number' || maxRuns < 1) {
        sendBadRequest(res, 'maxRuns must be a positive number or null');
        return;
      }
    }

    const id = generateId();
    const result = await coreDb
      .insert(scheduled_tasks)
      .values({
        id,
        prompt: prompt.trim(),
        name: name && typeof name === 'string' ? name.trim() : null,
        interval_minutes: intervalMinutes,
        status: 'active',
        max_runs: maxRuns ?? null,
        settings: {
          ...(workingDir && typeof workingDir === 'string' ? { workingDir: workingDir.trim() } : {}),
          ...(model && typeof model === 'string' ? { model } : {}),
        },
        created_by: 'user',
        updated_by: 'user',
      })
      .returning();

    if (!result || result.length === 0) {
      throw new Error('Failed to insert task');
    }

    res.status(201).json(rowToTask(result[0]));

    // Fire-and-forget: generate AI name if none provided
    if (!name) {
      generateName(prompt.trim())
        .then(async (generatedName) => {
          if (generatedName) {
            await coreDb
              .update(scheduled_tasks)
              .set({ name: generatedName, updated_by: 'system' })
              .where(eq(scheduled_tasks.id, id));
            console.log(`[Schedulers] Named task ${id}: "${generatedName}"`);
          }
        })
        .catch((err) => console.error(`[Schedulers] Name generation failed for ${id}:`, err));
    }
  }, 'create task')
);

// Update scheduled task (pause/resume/update)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { prompt, intervalMinutes, status, maxRuns, name, model } = req.body;

    // Check if system scheduler — only allow status changes (pause/resume)
    const existing = await coreDb
      .select()
      .from(scheduled_tasks)
      .where(and(eq(scheduled_tasks.id, req.params.id), ne(scheduled_tasks.status, 'deleted')))
      .limit(1);

    if (!existing || existing.length === 0) {
      sendNotFound(res, 'Task');
      return;
    }

    if ((existing[0].settings as SchedulerSettings | null | undefined)?.isSystem === true) {
      const nonStatusFields = [prompt, intervalMinutes, maxRuns, name, model].some(
        (v) => v !== undefined
      );
      if (nonStatusFields) {
        res
          .status(403)
          .json({ error: 'Forbidden', message: 'System schedulers cannot be modified' });
        return;
      }
    }

    const updates: Partial<typeof scheduled_tasks.$inferInsert> = { updated_by: 'user' };

    if (!validateOptionalString(res, prompt, 'prompt')) return;
    if (prompt !== undefined) updates.prompt = prompt.trim();

    if (name !== undefined) {
      updates.name = name && typeof name === 'string' ? name.trim() : null;
    }

    if (intervalMinutes !== undefined) {
      if (typeof intervalMinutes !== 'number' || intervalMinutes < 1) {
        sendBadRequest(res, 'Invalid interval');
        return;
      }
      updates.interval_minutes = intervalMinutes;
    }

    if (status !== undefined) {
      if (!requireEnum(res, status, ['active', 'paused'] as const, 'status')) return;
      updates.status = status;
    }

    if (maxRuns !== undefined) {
      if (maxRuns !== null && (typeof maxRuns !== 'number' || maxRuns < 1)) {
        sendBadRequest(res, 'maxRuns must be a positive number or null');
        return;
      }
      updates.max_runs = maxRuns;
    }

    if (model !== undefined) {
      if (!requireEnum(res, model, ['opus', 'sonnet', 'haiku'] as const, 'model')) return;
      const currentSettings = (existing[0]?.settings as Record<string, unknown>) || {};
      updates.settings = { ...currentSettings, model };
    }

    if (Object.keys(updates).length === 1 && updates.updated_by) {
      sendBadRequest(res, 'No valid updates provided');
      return;
    }

    const result = await coreDb
      .update(scheduled_tasks)
      .set(updates)
      .where(and(eq(scheduled_tasks.id, req.params.id), ne(scheduled_tasks.status, 'deleted')))
      .returning();

    if (!result || result.length === 0) {
      sendNotFound(res, 'Task');
      return;
    }

    res.json(rowToTask(result[0]));
  }, 'update task')
);

// Delete scheduled task (soft delete — system tasks cannot be deleted)
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(scheduled_tasks)
      .where(eq(scheduled_tasks.id, req.params.id))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Task');
      return;
    }

    if ((rows[0].settings as SchedulerSettings | null | undefined)?.isSystem === true) {
      res.status(403).json({ error: 'Forbidden', message: 'System schedulers cannot be deleted' });
      return;
    }

    await coreDb
      .update(scheduled_tasks)
      .set({ status: 'deleted', updated_by: 'user' })
      .where(eq(scheduled_tasks.id, req.params.id));

    res.json({ success: true });
  }, 'delete task')
);

// Trigger an immediate rerun of a scheduled task
router.post(
  '/:id/rerun',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(scheduled_tasks)
      .where(and(eq(scheduled_tasks.id, req.params.id), ne(scheduled_tasks.status, 'deleted')))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Task');
      return;
    }

    const row = rows[0];

    if (isTaskExecuting(row.id)) {
      res.status(409).json({ error: 'Conflict', message: 'Task is already running' });
      return;
    }

    if (isTaskQueued(row.id)) {
      res.status(409).json({ error: 'Conflict', message: 'Task is already queued' });
      return;
    }

    enqueueTask(row).catch((err) => {
      console.error(`[Scheduler] Rerun error for ${row.id}:`, err);
    });

    res.json({ success: true, message: 'Task rerun queued' });
  }, 'trigger rerun')
);

// ============================================
// Run Endpoints
// ============================================

// List all runs for a task
router.get(
  '/:id/runs',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(task_runs)
      .where(eq(task_runs.task_id, req.params.id))
      .orderBy(desc(task_runs.run_index));

    res.json(rows.map(rowToRun));
  }, 'list runs')
);

// Get latest run for a task
router.get(
  '/:id/latest-run',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(task_runs)
      .where(eq(task_runs.task_id, req.params.id))
      .orderBy(desc(task_runs.run_index))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Run');
      return;
    }

    res.json(rowToRun(rows[0]));
  }, 'get latest run')
);

// Get single run
router.get(
  '/:id/runs/:runId',
  asyncHandler(async (req, res) => {
    const rows = await coreDb
      .select()
      .from(task_runs)
      .where(and(eq(task_runs.id, req.params.runId), eq(task_runs.task_id, req.params.id)))
      .limit(1);

    if (!rows || rows.length === 0) {
      sendNotFound(res, 'Run');
      return;
    }

    res.json(rowToRun(rows[0]));
  }, 'get run')
);

// Get messages for a run - reads from chat_messages if run has a chat_id, else task_messages
router.get(
  '/:id/runs/:runId/messages',
  asyncHandler(async (req, res) => {
    const afterSequence = parseInt(req.query.afterSequence as string) || 0;

    const runRows = await coreDb
      .select({ chat_id: task_runs.chat_id })
      .from(task_runs)
      .where(eq(task_runs.id, req.params.runId))
      .limit(1);

    if (runRows && runRows.length > 0 && runRows[0].chat_id) {
      // New runs: read from chat_messages
      const rows = await coreDb
        .select()
        .from(chat_messages)
        .where(
          and(
            eq(chat_messages.chat_id, runRows[0].chat_id),
            gt(chat_messages.sequence, afterSequence)
          )
        )
        .orderBy(chat_messages.sequence);

      res.json(
        rows.map((row) => ({
          id: row.id,
          runId: req.params.runId,
          sequence: row.sequence,
          type: row.type,
          content: row.content,
          createdAt: row.created_at,
        }))
      );
    } else {
      // Old runs: read from task_messages
      const rows = await coreDb
        .select()
        .from(task_messages)
        .where(
          and(eq(task_messages.run_id, req.params.runId), gt(task_messages.sequence, afterSequence))
        )
        .orderBy(task_messages.sequence);

      res.json(rows.map(rowToMessage));
    }
  }, 'list messages')
);

export { router as schedulersRouter };
