/**
 * Push notification service for DevBot.
 *
 * Manages device token CRUD and sends push notifications via Firebase Cloud
 * Messaging (FCM) HTTP API. When FCM_SERVER_KEY is not set, notifications are
 * logged to the console (dev mode).
 */

import { coreDb } from './db/core.js';
import { push_tokens } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

// ──────────────────────────── Token CRUD ─────────────────────────────────────

/** Register (or upsert) a push token for a device. */
export async function registerPushToken(
  token: string,
  platform: 'android' | 'ios' | 'web',
  deviceName?: string
): Promise<void> {
  const existing = coreDb
    .select()
    .from(push_tokens)
    .where(eq(push_tokens.token, token))
    .get();

  if (existing) {
    coreDb
      .update(push_tokens)
      .set({
        platform,
        device_name: deviceName ?? existing.device_name,
        last_used_at: new Date().toISOString(),
        updated_by: 'device',
        updated_at: new Date().toISOString(),
      })
      .where(eq(push_tokens.token, token))
      .run();
  } else {
    coreDb
      .insert(push_tokens)
      .values({
        id: uuid(),
        token,
        platform,
        device_name: deviceName ?? `${platform} device`,
        last_used_at: new Date().toISOString(),
        created_by: 'device',
        updated_by: 'device',
      })
      .run();
  }
}

/** Remove a push token. */
export async function unregisterPushToken(token: string): Promise<boolean> {
  const result = coreDb
    .delete(push_tokens)
    .where(eq(push_tokens.token, token))
    .run();
  return result.changes > 0;
}

/** List all registered push tokens. */
export async function listPushTokens(): Promise<
  Array<{
    id: string;
    token: string;
    platform: string;
    device_name: string | null;
    last_used_at: string | null;
    created_at: string;
  }>
> {
  return coreDb.select().from(push_tokens).all();
}

/** Get all FCM tokens (for sending notifications). */
export async function getAllFcmTokens(): Promise<string[]> {
  const tokens = coreDb
    .select({ token: push_tokens.token })
    .from(push_tokens)
    .all();
  return tokens.map((t) => t.token);
}

// ──────────────────────────── FCM Push ───────────────────────────────────────

const FCM_URL = 'https://fcm.googleapis.com/fcm/send';

interface FcmResponse {
  success?: number;
  results?: Array<{ error?: string }>;
}

/**
 * Send a push notification to all registered devices via FCM.
 * If FCM_SERVER_KEY is not set, logs the notification to console (dev mode).
 */
export async function sendPushNotification(
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  const tokens = await getAllFcmTokens();

  if (tokens.length === 0) {
    console.log('[Push] No registered devices, skipping notification');
    return;
  }

  if (!serverKey) {
    console.log(`[Push] (dev mode) Would send to ${tokens.length} device(s):`);
    console.log(`  Title: ${title}`);
    console.log(`  Body: ${body}`);
    if (data) console.log(`  Data:`, data);
    return;
  }

  for (const token of tokens) {
    try {
      const response = await fetch(FCM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body },
          data: data ?? {},
        }),
      });

      const result = (await response.json()) as FcmResponse;

      // Auto-cleanup invalid tokens
      if (result.results?.[0]?.error === 'NotRegistered') {
        console.log(`[Push] Removing invalid token: ${token.slice(0, 8)}...`);
        await unregisterPushToken(token);
      }
    } catch (err) {
      console.error(`[Push] Failed to send to ${token.slice(0, 8)}...`, err);
    }
  }
}

// ──────────────────────────── Convenience ────────────────────────────────────

export async function notifyTaskComplete(taskName: string, taskId: string): Promise<void> {
  await sendPushNotification('Task Complete ✅', `"${taskName}" finished successfully`, {
    type: 'task_complete',
    taskId,
  });
}

export async function notifyTaskFailed(taskName: string, taskId: string, error?: string): Promise<void> {
  const body = error
    ? `"${taskName}" failed: ${error.slice(0, 100)}`
    : `"${taskName}" failed`;
  await sendPushNotification('Task Failed ❌', body, {
    type: 'task_failed',
    taskId,
  });
}

export async function notifyNewChatMessage(chatName: string, chatId: string): Promise<void> {
  await sendPushNotification('New Message 💬', `New message in "${chatName}"`, {
    type: 'new_message',
    chatId,
  });
}
