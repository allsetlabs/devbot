import path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import { coreDb, scheduled_tasks } from './db/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stable ID so this scheduler is idempotent across restarts
const AUTO_UPDATE_TASK_ID = 'devbot-auto-update';

/**
 * Seeds built-in system schedulers that users can pause but not delete.
 * Safe to call on every startup — uses upsert logic.
 */
export async function seedSystemSchedulers(): Promise<void> {
  // Derive the superrepo root from this file's location:
  // lib/ -> src/ -> backend/ -> devbot/ -> modules/ -> superrepo/
  const superrepoDir = path.resolve(__dirname, '../../../../../');
  const updateScript = path.join(superrepoDir, 'update.sh');

  const existing = await coreDb
    .select()
    .from(scheduled_tasks)
    .where(eq(scheduled_tasks.id, AUTO_UPDATE_TASK_ID))
    .limit(1);

  if (existing.length > 0) {
    // Update the script path in case the repo was moved, but preserve user's pause state
    const current = existing[0];
    const currentSettings = (current.settings as Record<string, unknown>) ?? {};
    await coreDb
      .update(scheduled_tasks)
      .set({
        prompt: buildPrompt(updateScript),
        settings: { ...currentSettings, isSystem: true, updateScript, model: 'haiku' },
        updated_by: 'system',
        updated_at: new Date().toISOString(),
      })
      .where(eq(scheduled_tasks.id, AUTO_UPDATE_TASK_ID));

    console.log('[Seed] System scheduler "DevBot Auto-Update" refreshed');
    return;
  }

  // First-time creation
  const now = new Date().toISOString();
  await coreDb.insert(scheduled_tasks).values({
    id: AUTO_UPDATE_TASK_ID,
    name: 'DevBot Auto-Update',
    prompt: buildPrompt(updateScript),
    interval_minutes: 1440, // 24 hours
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
