/**
 * Unified Notification Service
 *
 * Central hub for all DevBot notifications. Ties together:
 * - Push notifications (FCM to mobile/desktop)
 * - TTS synthesis (edge-tts — generate audio so the client can play it aloud)
 * - Notification history (FileStore — persistent, searchable log)
 * - Priority levels & categories for filtering
 *
 * Other modules (scheduler-worker, event-worker, interactive-chat) call this
 * service instead of push-service directly, getting TTS + history for free.
 */

import { FileStore, type FileStoreRecord } from './file-store.js';
import { sendPushNotification } from './push-service.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { coreDb } from './db/core.js';
import { application_settings } from './db/schema.js';
import { eq } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'scheduler'     // Scheduler task completed / failed
  | 'event'         // Event trigger fired (stock alert, weather, file change)
  | 'chat'          // Agent requesting human input / new message
  | 'assist'        // Personal Assistant Mode — terminal requesting human attention
  | 'system'        // System alerts (disk space, tunnel status, health)
  | 'reminder'      // User-set reminders
  | 'custom';       // Anything else

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationRecord extends FileStoreRecord {
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  /** Whether TTS audio was generated for this notification */
  ttsGenerated: boolean;
  /** Path to TTS audio file (if generated, relative to /tmp/devbot/notifications/) */
  ttsAudioFile: string | null;
  /** Whether the notification has been read/acknowledged */
  read: boolean;
  /** Optional deep-link path in the app (e.g. /chats/abc123) */
  actionUrl: string | null;
  /** Optional metadata for context */
  metadata: Record<string, unknown>;
  /** Source that triggered this notification */
  source: string;
}

export interface SendNotificationOptions {
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  /** Generate TTS audio and include it with the notification */
  speak?: boolean;
  /** Custom TTS text (defaults to `${title}. ${body}`) */
  ttsText?: string;
  /** Deep-link path for the app to navigate to on tap */
  actionUrl?: string | null;
  /** Extra metadata */
  metadata?: Record<string, unknown>;
  /** Source identifier (e.g. 'scheduler', 'event-worker') */
  source?: string;
  /** Skip push notification (only log to history) */
  silent?: boolean;
}

// ─── Settings ───────────────────────────────────────────────────────────

const SETTINGS_PREFIX = 'notifications.';

interface NotificationSettings {
  enabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string;
  /** Categories to notify on (empty = all) */
  enabledCategories: NotificationCategory[];
  /** Minimum priority to notify (notifications below this are logged but not pushed) */
  minPriority: NotificationPriority;
  /** Do Not Disturb */
  dndEnabled: boolean;
  dndStartTime: string; // HH:MM
  dndEndTime: string;   // HH:MM
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  ttsEnabled: true,
  ttsVoice: 'en-US-AndrewMultilingualNeural',
  enabledCategories: [],
  minPriority: 'low',
  dndEnabled: false,
  dndStartTime: '22:00',
  dndEndTime: '08:00',
};

const PRIORITY_ORDER: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

function readSetting(key: string): string | null {
  const rows = coreDb
    .select({ value: application_settings.value })
    .from(application_settings)
    .where(eq(application_settings.key, `${SETTINGS_PREFIX}${key}`))
    .limit(1)
    .all();
  return rows[0]?.value ?? null;
}

function writeSetting(key: string, value: string): void {
  coreDb
    .insert(application_settings)
    .values({ key: `${SETTINGS_PREFIX}${key}`, value })
    .onConflictDoUpdate({
      target: application_settings.key,
      set: { value, updated_by: 'system', updated_at: new Date().toISOString() },
    })
    .run();
}

export function getNotificationSettings(): NotificationSettings {
  const settings = { ...DEFAULT_SETTINGS };

  const enabled = readSetting('enabled');
  if (enabled !== null) settings.enabled = enabled === 'true';

  const ttsEnabled = readSetting('ttsEnabled');
  if (ttsEnabled !== null) settings.ttsEnabled = ttsEnabled === 'true';

  const ttsVoice = readSetting('ttsVoice');
  if (ttsVoice) settings.ttsVoice = ttsVoice;

  const categories = readSetting('enabledCategories');
  if (categories) {
    try {
      settings.enabledCategories = JSON.parse(categories);
    } catch { /* keep default */ }
  }

  const minPriority = readSetting('minPriority');
  if (minPriority && PRIORITY_ORDER.includes(minPriority as NotificationPriority)) {
    settings.minPriority = minPriority as NotificationPriority;
  }

  const dndEnabled = readSetting('dndEnabled');
  if (dndEnabled !== null) settings.dndEnabled = dndEnabled === 'true';

  const dndStart = readSetting('dndStartTime');
  if (dndStart) settings.dndStartTime = dndStart;

  const dndEnd = readSetting('dndEndTime');
  if (dndEnd) settings.dndEndTime = dndEnd;

  return settings;
}

export function updateNotificationSettings(updates: Partial<NotificationSettings>): NotificationSettings {
  if (updates.enabled !== undefined) writeSetting('enabled', String(updates.enabled));
  if (updates.ttsEnabled !== undefined) writeSetting('ttsEnabled', String(updates.ttsEnabled));
  if (updates.ttsVoice !== undefined) writeSetting('ttsVoice', updates.ttsVoice);
  if (updates.enabledCategories !== undefined) writeSetting('enabledCategories', JSON.stringify(updates.enabledCategories));
  if (updates.minPriority !== undefined) writeSetting('minPriority', updates.minPriority);
  if (updates.dndEnabled !== undefined) writeSetting('dndEnabled', String(updates.dndEnabled));
  if (updates.dndStartTime !== undefined) writeSetting('dndStartTime', updates.dndStartTime);
  if (updates.dndEndTime !== undefined) writeSetting('dndEndTime', updates.dndEndTime);

  return getNotificationSettings();
}

// ─── DND check ──────────────────────────────────────────────────────────

function isDndActive(settings: NotificationSettings): boolean {
  if (!settings.dndEnabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = settings.dndStartTime.split(':').map(Number);
  const [endH, endM] = settings.dndEndTime.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

function meetsMinPriority(priority: NotificationPriority, minPriority: NotificationPriority): boolean {
  return PRIORITY_ORDER.indexOf(priority) >= PRIORITY_ORDER.indexOf(minPriority);
}

// ─── TTS ────────────────────────────────────────────────────────────────

const TTS_DIR = '/tmp/devbot/notifications/tts';

function ensureTtsDir(): void {
  if (!fs.existsSync(TTS_DIR)) {
    fs.mkdirSync(TTS_DIR, { recursive: true });
  }
}

/**
 * Synthesize TTS audio for a notification. Returns the file path or null on failure.
 */
async function synthesizeTts(text: string, voice: string): Promise<string | null> {
  ensureTtsDir();
  const filename = `notif-${Date.now()}.mp3`;
  const outputPath = path.join(TTS_DIR, filename);

  const safeText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeVoice = voice.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const script = `import asyncio, edge_tts
asyncio.run(edge_tts.Communicate('${safeText}', '${safeVoice}').save('${outputPath}'))`;

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', ['-c', script], {
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `edge-tts exited with code ${code}`));
      });

      proc.on('error', reject);
    });

    if (fs.existsSync(outputPath)) {
      return filename;
    }
    return null;
  } catch (err) {
    console.error('[NotificationService] TTS synthesis failed:', err);
    return null;
  }
}

// ─── FileStore for notification history ─────────────────────────────────

const STORE_DIR = '/tmp/devbot/data';

export const notificationStore = new FileStore<NotificationRecord>({
  filePath: path.join(STORE_DIR, 'notifications.json'),
  name: 'notifications',
  autoCommit: false,
  idLength: 10,
});

// ─── Core send function ─────────────────────────────────────────────────

/**
 * Send a notification through all configured channels.
 *
 * 1. Logs to notification history (FileStore)
 * 2. Sends push notification to mobile/desktop (FCM)
 * 3. Optionally synthesizes TTS audio for the client to play
 *
 * Returns the created notification record.
 */
export async function sendNotification(opts: SendNotificationOptions): Promise<NotificationRecord> {
  const settings = getNotificationSettings();
  const priority = opts.priority ?? 'normal';
  const category = opts.category;

  // Always log to history, regardless of settings
  let ttsFile: string | null = null;

  // Check if we should actually notify (push + TTS)
  const shouldNotify =
    settings.enabled &&
    !isDndActive(settings) &&
    meetsMinPriority(priority, settings.minPriority) &&
    (settings.enabledCategories.length === 0 || settings.enabledCategories.includes(category));

  // TTS synthesis
  if (shouldNotify && settings.ttsEnabled && opts.speak !== false) {
    const ttsText = opts.ttsText || `${opts.title}. ${opts.body}`;
    ttsFile = await synthesizeTts(ttsText, settings.ttsVoice);
  }

  // Create notification record
  const createData: Omit<NotificationRecord, 'id' | 'created_at' | 'updated_at'> = {
    title: opts.title,
    body: opts.body,
    category,
    priority,
    ttsGenerated: ttsFile !== null,
    ttsAudioFile: ttsFile,
    read: false,
    actionUrl: opts.actionUrl ?? null,
    metadata: opts.metadata ?? {},
    source: opts.source ?? 'system',
    created_by: 'system',
    updated_by: 'system',
    settings: {},
  };
  const record = await notificationStore.create(createData);

  // Push notification (async, don't block)
  if (shouldNotify && !opts.silent) {
    sendPushNotification(opts.title, opts.body, {
      type: 'notification',
      category,
      priority,
      notificationId: record.id,
      ...(opts.actionUrl ? { actionUrl: opts.actionUrl } : {}),
      ...(ttsFile ? { ttsAudioFile: ttsFile } : {}),
    }).catch((err) => {
      console.error('[NotificationService] Push failed:', err);
    });
  }

  console.log(
    `[NotificationService] ${shouldNotify ? '📢' : '📝'} [${priority}/${category}] ${opts.title}${ttsFile ? ' (TTS)' : ''}${shouldNotify ? '' : ' (silent — settings filter)'}`
  );

  return record;
}

// ─── Convenience helpers ────────────────────────────────────────────────

/** Notify that a scheduler task completed. */
export async function notifySchedulerComplete(taskName: string, taskId: string, chatId?: string): Promise<NotificationRecord> {
  return sendNotification({
    title: 'Task Complete ✅',
    body: `"${taskName}" finished successfully`,
    category: 'scheduler',
    priority: 'normal',
    speak: true,
    ttsText: `${taskName} finished successfully`,
    actionUrl: chatId ? `/chat/${chatId}` : null,
    metadata: { taskId, chatId },
    source: 'scheduler',
  });
}

/** Notify that a scheduler task failed. */
export async function notifySchedulerFailed(taskName: string, taskId: string, error?: string, chatId?: string): Promise<NotificationRecord> {
  return sendNotification({
    title: 'Task Failed ❌',
    body: error ? `"${taskName}" failed: ${error.slice(0, 100)}` : `"${taskName}" failed`,
    category: 'scheduler',
    priority: 'high',
    speak: true,
    ttsText: `${taskName} failed. ${error ? error.slice(0, 80) : 'Check the logs for details.'}`,
    actionUrl: chatId ? `/chat/${chatId}` : null,
    metadata: { taskId, chatId, error },
    source: 'scheduler',
  });
}

/** Notify that an event trigger fired. */
export async function notifyEventTriggered(sourceName: string, sourceType: string, details: string): Promise<NotificationRecord> {
  return sendNotification({
    title: `Event Triggered: ${sourceName}`,
    body: details,
    category: 'event',
    priority: 'normal',
    speak: true,
    ttsText: `Event triggered: ${sourceName}. ${details}`,
    metadata: { sourceType, details },
    source: 'event-worker',
  });
}

/** Notify that a chat agent is requesting human input. */
export async function notifyAgentNeedsInput(chatName: string, chatId: string, question?: string): Promise<NotificationRecord> {
  return sendNotification({
    title: 'Agent Needs Input 💬',
    body: question ? `"${chatName}": ${question.slice(0, 120)}` : `"${chatName}" is waiting for your input`,
    category: 'chat',
    priority: 'high',
    speak: true,
    ttsText: question
      ? `${chatName} is asking: ${question.slice(0, 100)}`
      : `${chatName} needs your attention`,
    actionUrl: `/chat/${chatId}`,
    metadata: { chatId, question },
    source: 'chat',
  });
}

/** Notify that an assist request needs human attention. */
export async function notifyAssistRequest(requestId: string, question: string, source: string, sourceLabel?: string): Promise<NotificationRecord> {
  const label = sourceLabel || source;
  return sendNotification({
    title: `🆘 ${label} needs your input`,
    body: question.length > 120 ? question.slice(0, 120) + '…' : question,
    category: 'assist',
    priority: 'high',
    speak: true,
    ttsText: `Attention needed. ${label} is asking: ${question.slice(0, 100)}`,
    actionUrl: '/assist',
    metadata: { assistRequestId: requestId, source, sourceLabel },
    source: 'assist',
  });
}

/** Send a system alert notification. */
export async function notifySystem(title: string, body: string, priority: NotificationPriority = 'normal'): Promise<NotificationRecord> {
  return sendNotification({
    title,
    body,
    category: 'system',
    priority,
    speak: priority === 'high' || priority === 'urgent',
    source: 'system',
  });
}

/** Mark a notification as read. */
export async function markNotificationRead(id: string): Promise<NotificationRecord | null> {
  try {
    const result = await notificationStore.update(id, { read: true });
    return result ?? null;
  } catch {
    return null;
  }
}

/** Mark all notifications as read. */
export async function markAllRead(): Promise<number> {
  const unread = await notificationStore.list({ filter: { read: false } });
  let count = 0;
  for (const n of unread) {
    try {
      await notificationStore.update(n.id, { read: true });
      count++;
    } catch { /* skip */ }
  }
  return count;
}

/** Get unread notification count. */
export async function getUnreadCount(): Promise<number> {
  const all = await notificationStore.list();
  return all.filter((n) => !n.read).length;
}

/** Get the TTS audio file path for a notification. */
export function getTtsAudioPath(filename: string): string {
  return path.join(TTS_DIR, filename);
}

/** Clean up old TTS files (older than 24 hours). */
export async function cleanupOldTtsFiles(): Promise<number> {
  ensureTtsDir();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let cleaned = 0;

  try {
    const files = fs.readdirSync(TTS_DIR);
    for (const file of files) {
      const filePath = path.join(TTS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch { /* skip */ }
    }
  } catch { /* dir might not exist */ }

  return cleaned;
}

// Auto-cleanup every 6 hours
setInterval(() => {
  cleanupOldTtsFiles().catch(() => {});
}, 6 * 60 * 60 * 1000);
