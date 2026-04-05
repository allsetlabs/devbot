/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuidv4 } from 'uuid';
import { coreDb } from './db/core.js';
import { sql } from 'drizzle-orm';
import { listTmuxSessions } from './tmux.js';
import { startXtermWs, isPortActive } from './xterm-ws.js';

export type SessionRow = any;

/**
 * Recover existing sessions on backend startup.
 * This restarts WebSocket servers for sessions that have active tmux sessions
 * but lost their WebSocket servers due to backend restart.
 */
export async function recoverSessions(): Promise<void> {
  console.log('Session recovery: Starting...');

  try {
    // Get all sessions from database
    const rows = await coreDb.run(sql`SELECT * FROM sessions ORDER BY created_at ASC`);

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log('Session recovery: No sessions to recover');
      return;
    }

    // Get active tmux sessions
    const tmuxSessions = await listTmuxSessions();
    const activeTmuxIds = new Set(tmuxSessions);

    let recovered = 0;
    let markedInactive = 0;

    for (const row of rows as SessionRow[]) {
      const tmuxId = `devbot_${row.id}`;
      const hasTmux = activeTmuxIds.has(tmuxId);

      if (hasTmux) {
        try {
          if (!isPortActive(row.port)) {
            await startXtermWs(row.port, tmuxId);
            console.log(`Session recovery: Restored session ${row.id} on port ${row.port}`);
            recovered++;
            await coreDb.run(sql`UPDATE sessions SET status = 'active' WHERE id = ${row.id}`);
          } else {
            console.log(`Session recovery: Session ${row.id} already active on port ${row.port}`);
          }
        } catch (err) {
          console.error(`Session recovery: Failed to restore session ${row.id}:`, err);
          await coreDb.run(sql`UPDATE sessions SET status = 'inactive' WHERE id = ${row.id}`);
          markedInactive++;
        }
      } else {
        // tmux session doesn't exist - mark as inactive
        if (row.status === 'active') {
          await coreDb.run(sql`UPDATE sessions SET status = 'inactive' WHERE id = ${row.id}`);
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

/**
 * Recover interactive chats that were executing when the backend died.
 * Finds chats with is_executing=true, inserts a system message notifying
 * the user, and resets the flag.
 */
export async function recoverInteractiveChats(): Promise<void> {
  console.log('Chat recovery: Starting...');

  try {
    const chats = await coreDb.run(sql`SELECT id FROM interactive_chats WHERE is_executing = 1`);

    if (!chats || !Array.isArray(chats) || chats.length === 0) {
      console.log('Chat recovery: No interrupted chats');
      return;
    }

    for (const chat of chats as any[]) {
      // Get current max sequence for this chat
      const maxSeqData = await coreDb.run(
        sql`SELECT sequence FROM chat_messages WHERE chat_id = ${chat.id} ORDER BY sequence DESC LIMIT 1`
      );

      const nextSequence =
        (Array.isArray(maxSeqData) && maxSeqData[0] ? (maxSeqData[0] as any).sequence : 0) + 1;

      // Insert a system message notifying the user
      await coreDb.run(
        sql`INSERT INTO chat_messages (id, chat_id, sequence, type, content, created_by, created_at, updated_by, updated_at, settings) VALUES (${uuidv4().slice(0, 12)}, ${chat.id}, ${nextSequence}, 'system', ${JSON.stringify(
          {
            type: 'system',
            message:
              'Backend restarted — execution was interrupted. Send a new message to continue.',
          }
        )}, 'system', ${new Date().toISOString()}, 'system', ${new Date().toISOString()}, '{}')`
      );

      // Reset the flag
      await coreDb.run(
        sql`UPDATE interactive_chats SET is_executing = 0, updated_by = 'system', updated_at = ${new Date().toISOString()} WHERE id = ${chat.id}`
      );

      console.log(`Chat recovery: Marked chat ${chat.id} as interrupted`);
    }

    console.log(
      `Chat recovery: Complete. Recovered ${(chats as any[]).length} interrupted chat(s)`
    );
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
    const runs = await coreDb.run(sql`SELECT id, task_id FROM task_runs WHERE status = 'running'`);

    if (!runs || !Array.isArray(runs) || runs.length === 0) {
      console.log('Task run recovery: No orphaned task runs');
      return;
    }

    const now = new Date().toISOString();
    await coreDb.run(
      sql`UPDATE task_runs SET status = 'failed', error_message = 'Interrupted by backend restart', completed_at = ${now}, updated_by = 'system', updated_at = ${now} WHERE status = 'running'`
    );

    // Sync run_count on affected tasks so next run gets the correct index.
    // Also set last_run_at=now and next_run_at=now+interval so the scheduler
    // doesn't immediately re-fire on startup (which creates duplicate chats).
    const affectedTaskIds = [...new Set((runs as any[]).map((r) => r.task_id))];
    for (const taskId of affectedTaskIds) {
      const maxRun = await coreDb.run(
        sql`SELECT run_index FROM task_runs WHERE task_id = ${taskId} ORDER BY run_index DESC LIMIT 1`
      );

      const task = await coreDb.run(
        sql`SELECT interval_minutes FROM scheduled_tasks WHERE id = ${taskId} LIMIT 1`
      );

      const intervalMinutes =
        Array.isArray(task) && task[0] ? (task[0] as any).interval_minutes : 60;
      const nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();

      if (Array.isArray(maxRun) && maxRun[0]) {
        await coreDb.run(
          sql`UPDATE scheduled_tasks SET run_count = ${(maxRun[0] as any).run_index}, last_run_at = ${now}, next_run_at = ${nextRunAt}, updated_by = 'system', updated_at = ${now} WHERE id = ${taskId}`
        );
      }
    }

    console.log(
      `Task run recovery: Complete. Marked ${(runs as any[]).length} orphaned run(s) as failed`
    );
  } catch (error) {
    console.error('Task run recovery: Unexpected error:', error);
  }
}
