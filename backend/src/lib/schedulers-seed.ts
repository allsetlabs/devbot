import path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import { coreDb, scheduled_tasks } from './db/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stable IDs so schedulers are idempotent across restarts
const AUTO_UPDATE_TASK_ID = 'devbot-auto-update';
const CEO_SCHEDULER_ID = 'devbot-ceo-scheduler';

/**
 * Seeds built-in system schedulers that users can pause but not delete.
 * Safe to call on every startup — uses upsert logic.
 */
export async function seedSystemSchedulers(): Promise<void> {
  // Derive the superrepo root from this file's location:
  // lib/ -> src/ -> backend/ -> devbot/ -> modules/ -> superrepo/
  const superrepoDir = path.resolve(__dirname, '../../../../../');
  const updateScript = path.join(superrepoDir, 'update.sh');

  const now = new Date().toISOString();

  // ── Auto-Update scheduler ────────────────────────────────────────────────
  const existingUpdate = await coreDb
    .select()
    .from(scheduled_tasks)
    .where(eq(scheduled_tasks.id, AUTO_UPDATE_TASK_ID))
    .limit(1);

  if (existingUpdate.length > 0) {
    const currentSettings = (existingUpdate[0].settings as Record<string, unknown>) ?? {};
    await coreDb
      .update(scheduled_tasks)
      .set({
        prompt: buildPrompt(updateScript),
        settings: { ...currentSettings, isSystem: true, updateScript, model: 'haiku' },
        updated_by: 'system',
        updated_at: now,
      })
      .where(eq(scheduled_tasks.id, AUTO_UPDATE_TASK_ID));
    console.log('[Seed] System scheduler "DevBot Auto-Update" refreshed');
  } else {
    await coreDb.insert(scheduled_tasks).values({
      id: AUTO_UPDATE_TASK_ID,
      name: 'DevBot Auto-Update',
      prompt: buildPrompt(updateScript),
      interval_minutes: 1440,
      status: 'active',
      run_count: 0,
      max_runs: null,
      created_by: 'system',
      created_at: now,
      updated_by: 'system',
      updated_at: now,
      settings: { isSystem: true, updateScript, model: 'haiku' },
    });
    console.log('[Seed] System scheduler "DevBot Auto-Update" created (runs every 24h)');
  }

  // ── CEO Scheduler — autonomous feature builder ───────────────────────
  const devbotDir = path.resolve(__dirname, '../../..');
  const backlogPath = path.join(devbotDir, 'BACKLOG.md');

  const existingCeo = await coreDb
    .select()
    .from(scheduled_tasks)
    .where(eq(scheduled_tasks.id, CEO_SCHEDULER_ID))
    .limit(1);

  if (existingCeo.length > 0) {
    const currentSettings = (existingCeo[0].settings as Record<string, unknown>) ?? {};
    await coreDb
      .update(scheduled_tasks)
      .set({
        prompt: buildCeoPrompt(backlogPath, devbotDir),
        context_file: backlogPath,
        settings: {
          ...currentSettings,
          isSystem: true,
          model: 'opus',
          effort: 'high',
          canSpawnSchedulers: true,
          workingDir: devbotDir,
        },
        updated_by: 'system',
        updated_at: now,
      })
      .where(eq(scheduled_tasks.id, CEO_SCHEDULER_ID));
    console.log('[Seed] System scheduler "DevBot CEO" refreshed');
  } else {
    await coreDb.insert(scheduled_tasks).values({
      id: CEO_SCHEDULER_ID,
      name: 'DevBot CEO',
      prompt: buildCeoPrompt(backlogPath, devbotDir),
      interval_minutes: 120,
      trigger_type: 'interval',
      priority: 'high',
      category: 'system',
      context_file: backlogPath,
      status: 'paused', // Start paused — user activates when ready
      run_count: 0,
      max_runs: null,
      created_by: 'system',
      created_at: now,
      updated_by: 'system',
      updated_at: now,
      settings: {
        isSystem: true,
        model: 'opus',
        effort: 'high',
        canSpawnSchedulers: true,
        workingDir: devbotDir,
      },
    });
    console.log('[Seed] System scheduler "DevBot CEO" created (runs every 2h, starts paused)');
  }
}

function buildPrompt(updateScript: string): string {
  return (
    `Run the DevBot auto-update check by executing this shell script:\n` +
    `bash "${updateScript}"\n\n` +
    `The script will:\n` +
    `1. Check if there are new commits on the main branch\n` +
    `2. Pull latest code and submodules\n` +
    `3. Run make setup-system && make install\n` +
    `4. Restart DevBot\n\n` +
    `If the script exits with code 0 and prints "Already up to date", report that no updates were needed. ` +
    `Otherwise report what was updated.`
  );
}

function buildCeoPrompt(backlogPath: string, devbotDir: string): string {
  return (
    `You are the DevBot CEO Scheduler — an autonomous agent that picks the next feature from the backlog and implements it.\n\n` +
    `## Instructions\n\n` +
    `1. Read the backlog file at: ${backlogPath}\n` +
    `2. Find the item marked with \`NEXT\`\n` +
    `3. Implement that ONE feature completely (backend + frontend if applicable)\n` +
    `4. Test your changes (run lint, type-check)\n` +
    `5. Commit your changes with a descriptive message\n` +
    `6. Update the backlog file:\n` +
    `   - Mark the completed item as \`[x]\`\n` +
    `   - Move the \`NEXT\` marker to the next priority item\n` +
    `   - Add an entry to the "Completed Features Log" table\n` +
    `7. If the feature is too large for a single session, implement what you can, update the backlog with progress notes, and mark a sub-task as NEXT\n\n` +
    `## Rules\n\n` +
    `- Work within the DevBot module at: ${devbotDir}\n` +
    `- Follow the coding standards in AGENTS.md\n` +
    `- Use the \`settings\` JSONB column for new optional fields to avoid schema migrations when possible\n` +
    `- Create a DevBot interactive chat for this session so the user can review your work\n` +
    `- Do NOT restart DevBot\n` +
    `- If you get stuck, document what went wrong in the backlog under the feature entry and move NEXT to a different item\n`
  );
}
