import { eq, desc } from 'drizzle-orm';
import { coreDb, sessions, interactive_chats, task_runs, scheduled_tasks } from './db/core.js';
import { listTmuxSessions } from './tmux.js';
import { startXtermWs, isPortActive } from './xterm-ws.js';
import { sendMessage } from './interactive-chat-worker.js';

/**
 * Recover existing sessions on backend startup.
 * This restarts WebSocket servers for sessions that have active tmux sessions
 * but lost their WebSocket servers due to backend restart.
 */
export async function recoverSessions(): Promise<void> {
  console.log('Session recovery: Starting...');

  try {
    // Get all sessions from database
    const rows = await coreDb.select().from(sessions).orderBy(sessions.created_at).all();

    if (!rows || rows.length === 0) {
      console.log('Session recovery: No sessions to recover');
      return;
    }

    // Get active tmux sessions
    const tmuxSessions = await listTmuxSessions();
    const activeTmuxIds = new Set(tmuxSessions);

    let recovered = 0;
    let markedInactive = 0;

    for (const row of rows) {
      const tmuxId = `devbot_${row.id}`;
      const hasTmux = activeTmuxIds.has(tmuxId);

      if (hasTmux) {
        try {
          if (!isPortActive(row.port)) {
            await startXtermWs(row.port, tmuxId);
            console.log(`Session recovery: Restored session ${row.id} on port ${row.port}`);
            recovered++;
            await coreDb
              .update(sessions)
              .set({ status: 'active', updated_by: 'system' })
              .where(eq(sessions.id, row.id));
          } else {
            console.log(`Session recovery: Session ${row.id} already active on port ${row.port}`);
          }
        } catch (err) {
          console.error(`Session recovery: Failed to restore session ${row.id}:`, err);
          await coreDb
            .update(sessions)
            .set({ status: 'inactive', updated_by: 'system' })
            .where(eq(sessions.id, row.id));
          markedInactive++;
        }
      } else {
        // tmux session doesn't exist - mark as inactive
        if (row.status === 'active') {
          await coreDb
            .update(sessions)
            .set({ status: 'inactive', updated_by: 'system' })
            .where(eq(sessions.id, row.id));
          console.log(`Session recovery: Marked session ${row.id} as inactive (tmux not found)`);
          markedInactive++;
        }
      }
    }

    console.log(
      `Session recovery: Complete. Recovered: ${recovered}, Marked inactive: ${markedInactive}`
    );
  } catch (error) {
    console.error('Session recovery: Unexpected error:', error);
  }
}

const RECOVERY_PROMPT =
  'DevBot was restarted and your previous execution was interrupted. ' +
  'Please read the chat history above to get context on what you were doing, ' +
  'then continue from where you left off.';

/**
 * Recover interactive chats that were executing when the backend died.
 * Finds chats with is_executing=true, resets the flag, and sends a
 * recovery message so Claude resumes work automatically.
 */
export async function recoverInteractiveChats(): Promise<void> {
  console.log('Chat recovery: Starting...');

  try {
    const chats = await coreDb
      .select({ id: interactive_chats.id })
      .from(interactive_chats)
      .where(eq(interactive_chats.is_executing, true))
      .all();

    if (!chats || chats.length === 0) {
      console.log('Chat recovery: No interrupted chats');
      return;
    }

    for (const chat of chats) {
      // Reset is_executing first so sendMessage can proceed
      await coreDb
        .update(interactive_chats)
        .set({
          is_executing: false,
          updated_by: 'system',
          updated_at: new Date().toISOString(),
        })
        .where(eq(interactive_chats.id, chat.id));

      // Send a recovery message that tells Claude to resume
      sendMessage(chat.id, RECOVERY_PROMPT).catch((err) => {
        console.error(`Chat recovery: Failed to resume chat ${chat.id}:`, err);
      });

      console.log(`Chat recovery: Resuming chat ${chat.id}`);
    }

    console.log(`Chat recovery: Complete. Resuming ${chats.length} interrupted chat(s)`);
  } catch (error) {
    console.error('Chat recovery: Unexpected error:', error);
  }
}

/**
 * Recover orphaned scheduler task runs that were executing when the backend died.
 * Marks any task_runs with status='running' as 'failed'.
 */
export async function recoverTaskRuns(): Promise<void> {
  console.log('Task run recovery: Starting...');

  try {
    const runs = await coreDb
      .select({ id: task_runs.id, task_id: task_runs.task_id })
      .from(task_runs)
      .where(eq(task_runs.status, 'running'))
      .all();

    if (!runs || runs.length === 0) {
      console.log('Task run recovery: No orphaned task runs');
      return;
    }

    const now = new Date().toISOString();
    await coreDb
      .update(task_runs)
      .set({
        status: 'failed',
        error_message: 'Interrupted by backend restart',
        completed_at: now,
        updated_by: 'system',
        updated_at: now,
      })
      .where(eq(task_runs.status, 'running'));

    // Sync run_count on affected tasks so next run gets the correct index.
    // Also set last_run_at=now and next_run_at=now+interval so the scheduler
    // doesn't immediately re-fire on startup (which creates duplicate chats).
    const affectedTaskIds = [...new Set(runs.map((r) => r.task_id))];
    for (const taskId of affectedTaskIds) {
      const maxRunRows = await coreDb
        .select({ run_index: task_runs.run_index })
        .from(task_runs)
        .where(eq(task_runs.task_id, taskId))
        .orderBy(desc(task_runs.run_index))
        .limit(1)
        .all();

      const taskRows = await coreDb
        .select({ interval_minutes: scheduled_tasks.interval_minutes })
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.id, taskId))
        .limit(1)
        .all();

      const intervalMinutes = taskRows[0]?.interval_minutes ?? 60;
      const nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

      if (maxRunRows[0]) {
        await coreDb
          .update(scheduled_tasks)
          .set({
            run_count: maxRunRows[0].run_index,
            last_run_at: now,
            next_run_at: nextRunAt,
            updated_by: 'system',
            updated_at: now,
          })
          .where(eq(scheduled_tasks.id, taskId));
      }
    }

    console.log(`Task run recovery: Complete. Marked ${runs.length} orphaned run(s) as failed`);
  } catch (error) {
    console.error('Task run recovery: Unexpected error:', error);
  }
}
