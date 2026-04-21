import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql } from 'drizzle-orm';
import { coreDb, scheduled_tasks, task_runs, interactive_chats, chat_messages } from './db/core.js';
import type { ScheduledTaskRow, SchedulerSettings } from './db/types.js';
import { registerChatExecution, unregisterChatExecution } from './interactive-chat-worker.js';
import { spawnClaude, isExecuting, stopExecution } from './claude-spawn.js';
import { DEVBOT_PROJECTS_DIR } from './env.js';
import type { StreamParserConfig } from './stream-parser.js';

const CHECK_INTERVAL_MS = 30000;
const OUTPUT_DIR = '/tmp/devbot/scheduler';
const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5000;

const SCHEDULER_SYSTEM_PROMPT =
  'You are running as an autonomous scheduled task. Complete the task directly without asking clarifying questions. Make reasonable assumptions if needed. The user will not interact with you during this execution.';

const SCHEDULER_PROMPT_SUFFIX =
  '\n\nIf there are any code changes done by this task please do commit it and do not push, just git commit on the current branch you are in, do not switch branch.';

// Track running task loops
const runningTasks = new Map<string, { stopRequested: boolean }>();

// Global execution queue - FCFS, only one task runs at a time
interface QueueEntry {
  task: ScheduledTaskRow;
  resolve: (success: boolean) => void;
}
const executionQueue: QueueEntry[] = [];
let isProcessingQueue = false;

function ensureOutputDir(taskId: string): string {
  const dir = join(OUTPUT_DIR, taskId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Enqueue a task for execution. Returns a promise that resolves when the task completes.
 */
export function enqueueTask(task: ScheduledTaskRow): Promise<boolean> {
  return new Promise((resolve) => {
    executionQueue.push({ task, resolve });
    console.log(
      `[Scheduler] Task ${task.id} queued (position ${executionQueue.length}, ${isProcessingQueue ? 'another task running' : 'queue idle'})`
    );
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (executionQueue.length > 0) {
    const entry = executionQueue.shift()!;
    const settings = entry.task.settings as SchedulerSettings | null | undefined;
    const maxRetries = settings?.maxRetries ?? DEFAULT_MAX_RETRIES;
    console.log(
      `[Scheduler] Dequeuing task ${entry.task.id} (${executionQueue.length} remaining in queue)`
    );

    let success = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        success = await executeTask(entry.task);
        if (success) break;
        if (attempt < maxRetries) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Scheduler] Task ${entry.task.id} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          const freshTask = coreDb.select().from(scheduled_tasks).where(eq(scheduled_tasks.id, entry.task.id)).get();
          if (freshTask) entry.task = freshTask;
        }
      } catch (error) {
        console.error(`[Scheduler] Queue execution error for ${entry.task.id} (attempt ${attempt + 1}):`, error);
        if (attempt >= maxRetries) break;
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    entry.resolve(success);
  }

  isProcessingQueue = false;
}

/**
 * Create a chat session for a scheduler run.
 */
function createSchedulerChat(task: ScheduledTaskRow, runIndex: number, model: 'opus' | 'sonnet' | 'haiku' = 'sonnet', workingDir?: string): string | null {
  const taskName = task.name || 'Scheduler';
  const chatId = uuidv4().slice(0, 8);
  const chatName = `${taskName} #${runIndex}`;

  try {
    coreDb
      .insert(interactive_chats)
      .values({
        id: chatId,
        name: chatName,
        type: 'scheduler',
        status: 'active',
        permission_mode: 'dangerous',
        model,
        is_executing: true,
        created_by: 'system',
        updated_by: 'system',
        settings: { task_id: task.id, ...(workingDir ? { workingDir } : {}) },
      })
      .run();
  } catch (err) {
    console.error(`[Scheduler] Failed to create chat record:`, err);
    return null;
  }

  try {
    coreDb
      .insert(chat_messages)
      .values({
        id: uuidv4().slice(0, 12),
        chat_id: chatId,
        sequence: 1,
        type: 'user',
        content: {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: task.prompt }],
          },
        },
        created_by: 'system',
        updated_by: 'system',
      })
      .run();
  } catch (err) {
    console.error(`[Scheduler] Failed to insert initial chat message:`, err);
  }

  console.log(`[Scheduler] Created chat "${chatName}" (${chatId}) for task ${task.id}`);
  return chatId;
}

/**
 * Run a single scheduled task using the unified spawnClaude API.
 */
async function executeTask(task: ScheduledTaskRow): Promise<boolean> {
  const taskId = task.id;
  const outputDir = ensureOutputDir(taskId);
  const runIndex = task.run_count + 1;
  const runId = uuidv4().slice(0, 12);
  const outputFile = join(outputDir, `${runIndex}.jsonl`);

  console.log(`[Scheduler] Starting task ${taskId} run #${runIndex}`);

  const settings = task.settings as SchedulerSettings | null | undefined;
  const model: 'opus' | 'sonnet' | 'haiku' = settings?.model || 'sonnet';
  const workingDir: string = settings?.workingDir || DEVBOT_PROJECTS_DIR;
  const chatId = createSchedulerChat(task, runIndex, model, settings?.workingDir);

  try {
    coreDb
      .insert(task_runs)
      .values({
        id: runId,
        task_id: taskId,
        run_index: runIndex,
        status: 'running',
        output_file: outputFile,
        ...(chatId ? { chat_id: chatId } : {}),
        created_by: 'system',
        updated_by: 'system',
      })
      .run();
  } catch (err) {
    console.error(`[Scheduler] Failed to create run record:`, err);
    return false;
  }

  return new Promise((resolve) => {
    let completed = false;

    const persist: StreamParserConfig & { initialSequence: number } = chatId
      ? {
          tableName: 'chat_messages',
          foreignKeyColumn: 'chat_id',
          foreignKeyValue: chatId,
          logPrefix: '[Scheduler]',
          initialSequence: 1,
        }
      : {
          tableName: 'task_messages',
          foreignKeyColumn: 'run_id',
          foreignKeyValue: runId,
          logPrefix: '[Scheduler]',
          initialSequence: 0,
        };

    const cleanup = (success: boolean, errorMessage?: string) => {
      if (completed) return;
      completed = true;

      if (chatId) unregisterChatExecution(chatId);

      // Update run record
      try {
        coreDb
          .update(task_runs)
          .set({
            completed_at: new Date().toISOString(),
            status: success ? 'completed' : 'failed',
            error_message: errorMessage || null,
            updated_by: 'system',
            updated_at: new Date().toISOString(),
          })
          .where(eq(task_runs.id, runId))
          .run();
      } catch (err) {
        console.error(`[Scheduler] Failed to update run record:`, err);
      }

      if (chatId) {
        try {
          coreDb
            .update(interactive_chats)
            .set({
              is_executing: false,
              updated_by: 'system',
              updated_at: new Date().toISOString(),
            })
            .where(eq(interactive_chats.id, chatId))
            .run();
        } catch {
          /* ignore */
        }
      }

      // Update task record
      const now = new Date();
      const updates: Record<string, unknown> = {
        last_run_at: now.toISOString(),
        run_count: runIndex,
        updated_by: 'system',
        updated_at: now.toISOString(),
      };

      if (task.max_runs !== null && runIndex >= task.max_runs) {
        updates.status = 'paused';
        console.log(`[Scheduler] Task ${taskId} reached max_runs (${task.max_runs}), pausing`);
      } else {
        updates.next_run_at = new Date(
          now.getTime() + task.interval_minutes * 60 * 1000
        ).toISOString();
      }

      try {
        coreDb.update(scheduled_tasks).set(updates).where(eq(scheduled_tasks.id, taskId)).run();
      } catch (err) {
        console.error(`[Scheduler] Failed to update task record:`, err);
      }

      console.log(
        `[Scheduler] Task ${taskId} run #${runIndex} ${success ? 'completed' : 'failed'}`
      );
      resolve(success);
    };

    const { process: proc } = spawnClaude({
      prompt: task.prompt,
      promptSuffix: SCHEDULER_PROMPT_SUFFIX,
      systemPrompts: [SCHEDULER_SYSTEM_PROMPT],
      workDir: workingDir,
      model,
      chrome: true,
      timeoutMs: 30 * 60 * 1000,
      trackAs: taskId,
      persist,
      onRawChunk: (chunk) => {
        try {
          appendFileSync(outputFile, chunk);
        } catch (err) {
          console.error(`[Scheduler] Failed to write to output file:`, err);
        }
      },
      onSessionId: (sid) => {
        if (chatId) {
          try {
            coreDb
              .update(interactive_chats)
              .set({
                claude_session_id: sid,
                updated_by: 'system',
                updated_at: new Date().toISOString(),
              })
              .where(eq(interactive_chats.id, chatId))
              .run();
            console.log(`[Scheduler] Captured session ID for chat ${chatId}: ${sid}`);
          } catch {
            /* ignore */
          }
        }
      },
      onComplete: (code) => {
        if (!completed) {
          const success = code === 0;
          cleanup(success, code !== 0 ? `Process exited with code ${code}` : undefined);
        }
      },
    });

    // Register with interactive chat worker for cross-module tracking
    if (chatId) registerChatExecution(chatId, proc);
  });
}

/**
 * Task loop - runs a task repeatedly at its interval
 */
async function taskLoop(taskId: string): Promise<void> {
  const context = { stopRequested: false };
  runningTasks.set(taskId, context);

  console.log(`[Scheduler] Starting loop for task ${taskId}`);

  while (!context.stopRequested) {
    try {
      const task = coreDb
        .select()
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.id, taskId))
        .get();

      if (!task || task.status !== 'active') {
        console.log(`[Scheduler] Task ${taskId} no longer active, stopping loop`);
        break;
      }

      if (task.max_runs !== null && task.run_count >= task.max_runs) {
        console.log(`[Scheduler] Task ${taskId} reached max_runs, stopping loop`);
        break;
      }

      if (isExecuting(taskId)) {
        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      if (executionQueue.some((entry) => entry.task.id === taskId)) {
        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      const executingChat = coreDb
        .select({ id: interactive_chats.id })
        .from(interactive_chats)
        .innerJoin(task_runs, eq(task_runs.chat_id, interactive_chats.id))
        .where(sql`${task_runs.task_id} = ${taskId} AND ${interactive_chats.is_executing} = 1`)
        .get();
      if (executingChat) {
        console.log(
          `[Scheduler] Task ${taskId}: chat ${executingChat.id} still marked executing, skipping`
        );
        await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
        continue;
      }

      const now = new Date();
      const shouldRun =
        task.last_run_at === null || (task.next_run_at && now >= new Date(task.next_run_at));

      if (shouldRun) {
        console.log(`[Scheduler] Queuing task ${taskId} for execution`);
        await enqueueTask(task);
      }

      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    } catch (error) {
      console.error(`[Scheduler] Error in task loop for ${taskId}:`, error);
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  runningTasks.delete(taskId);
  console.log(`[Scheduler] Loop stopped for task ${taskId}`);
}

/**
 * Stop a running task loop
 */
export function stopTaskLoop(taskId: string): void {
  const context = runningTasks.get(taskId);
  if (context) {
    context.stopRequested = true;
    console.log(`[Scheduler] Requested stop for task ${taskId}`);
  }

  stopExecution(taskId);
}

/**
 * Start the scheduler worker
 */
export async function startSchedulerWorker(): Promise<void> {
  console.log('[Scheduler] Worker starting...');

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const checkAndStartTasks = () => {
    try {
      const tasks = coreDb
        .select()
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.status, 'active'))
        .all();

      for (const task of tasks) {
        if (task.max_runs !== null && task.run_count >= task.max_runs) {
          continue;
        }
        if (!runningTasks.has(task.id)) {
          taskLoop(task.id).catch((err) => {
            console.error(`[Scheduler] Task loop error for ${task.id}:`, err);
          });
        }
      }

      for (const taskId of runningTasks.keys()) {
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.status !== 'active') {
          stopTaskLoop(taskId);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Worker error:', error);
    }
  };

  checkAndStartTasks();
  setInterval(checkAndStartTasks, CHECK_INTERVAL_MS);
  console.log('[Scheduler] Worker running');
}

export function getRunningTasks(): string[] {
  return Array.from(runningTasks.keys());
}

export function isTaskExecuting(taskId: string): boolean {
  return isExecuting(taskId);
}

export function isTaskQueued(taskId: string): boolean {
  return executionQueue.some((entry) => entry.task.id === taskId);
}
