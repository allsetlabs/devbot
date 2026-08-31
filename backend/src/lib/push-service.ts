/**
 * Push Notification Service
 *
 * Manages device token registration and notification delivery.
 * Currently supports Firebase Cloud Messaging (FCM) for Android push.
 *
 * To enable FCM sending:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Download the service account key JSON
 * 3. Set FCM_SERVICE_ACCOUNT_PATH env var to the path of the key file
 *
 * Without FCM configured, notifications are logged to console instead of sent.
 */

import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { coreDb } from './db/core.js';
import { push_tokens } from './db/schema.js';

// ── Token Management ────────────────────────────────────────────────────

export interface PushTokenRecord {
  id: string;
  token: string;
  platform: string;
  deviceName: string;
  lastUsedAt: string | null;
  createdAt: string;
}

/**
 * Register a device push token. If the token already exists, update it.
 */
export type PushPlatform = 'android' | 'ios' | 'web';

export function registerPushToken(
  token: string,
  platform: PushPlatform,
  deviceName: string = 'Unknown Device'
): PushTokenRecord {
  // Check if token already exists
  const existing = coreDb
    .select()
    .from(push_tokens)
    .where(eq(push_tokens.token, token))
    .get();

  if (existing) {
    // Update existing token
    coreDb
      .update(push_tokens)
      .set({
        platform: platform as typeof push_tokens.platform.enumValues[number],
        device_name: deviceName,
        updated_by: 'user',
        updated_at: new Date().toISOString(),
      })
      .where(eq(push_tokens.token, token))
      .run();

    return {
      id: existing.id,
      token: existing.token,
      platform,
      deviceName,
      lastUsedAt: existing.last_used_at,
      createdAt: existing.created_at,
    };
  }

  // Create new token
  const id = uuid();
  const now = new Date().toISOString();
  coreDb
    .insert(push_tokens)
    .values({
      id,
      token,
      platform: platform as typeof push_tokens.platform.enumValues[number],
      device_name: deviceName,
      created_by: 'user',
      created_at: now,
      updated_by: 'user',
      updated_at: now,
      settings: {},
    })
    .run();

  return { id, token, platform, deviceName, lastUsedAt: null, createdAt: now };
}

/**
 * Unregister a device push token.
 */
export function unregisterPushToken(token: string): boolean {
  const result = coreDb
    .delete(push_tokens)
    .where(eq(push_tokens.token, token))
    .run();

  return result.changes > 0;
}

/**
 * List all registered push tokens.
 */
export function listPushTokens(): PushTokenRecord[] {
  const rows = coreDb.select().from(push_tokens).all();
  return rows.map((r) => ({
    id: r.id,
    token: r.token,
    platform: r.platform,
    deviceName: r.device_name,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  }));
}

/**
 * Get all registered FCM tokens for sending push notifications.
 */
export function getAllFcmTokens(): string[] {
  const rows = coreDb
    .select({ token: push_tokens.token })
    .from(push_tokens)
    .all();

  return rows.map((r) => r.token);
}

// ── Notification Sending ────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Send a push notification to all registered devices.
 *
 * Uses FCM HTTP v1 API if FCM_SERVER_KEY is configured,
 * otherwise logs to console (useful for development).
 *
 * Returns the number of notifications successfully sent.
 */
export async function sendPushNotification(payload: PushPayload): Promise<number> {
  const tokens = getAllFcmTokens();
  if (tokens.length === 0) {
    console.log('[Push] No registered devices, skipping notification:', payload.title);
    return 0;
  }

  const fcmServerKey = process.env.FCM_SERVER_KEY;

  if (!fcmServerKey) {
    // Development mode: log the notification instead of sending
    console.log(`[Push] Would send to ${tokens.length} device(s):`, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
    return tokens.length;
  }

  // Send via FCM legacy HTTP API (simpler than v1 for server-key auth)
  let sent = 0;
  for (const token of tokens) {
    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'default',
          },
          data: payload.data || {},
          priority: 'high',
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          success?: number;
          results?: Array<{ error?: string }>;
        };
        if (result.success === 1) {
          sent++;
          // Update last_used_at
          coreDb
            .update(push_tokens)
            .set({ last_used_at: new Date().toISOString() })
            .where(eq(push_tokens.token, token))
            .run();
        } else {
          console.warn('[Push] FCM delivery failed for token:', token, result);
          // If the token is invalid, remove it
          if (result.results?.[0]?.error === 'NotRegistered') {
            unregisterPushToken(token);
            console.log('[Push] Removed invalid token:', token.slice(0, 20) + '...');
          }
        }
      } else {
        console.error('[Push] FCM HTTP error:', response.status, await response.text());
      }
    } catch (err) {
      console.error('[Push] Failed to send to token:', token.slice(0, 20) + '...', err);
    }
  }

  console.log(`[Push] Sent ${sent}/${tokens.length} notifications`);
  return sent;
}

/**
 * Send push notification for task completion events.
 */
export async function notifyTaskComplete(taskName: string, chatId?: string): Promise<void> {
  await sendPushNotification({
    title: '✅ Task Complete',
    body: taskName,
    data: {
      type: 'task_complete',
      ...(chatId ? { chatId } : {}),
    },
  });
}

/**
 * Send push notification for task failure events.
 */
export async function notifyTaskFailed(taskName: string, error?: string): Promise<void> {
  await sendPushNotification({
    title: '❌ Task Failed',
    body: `${taskName}${error ? `: ${error}` : ''}`,
    data: { type: 'task_failed' },
  });
}

/**
 * Send push notification for new chat messages.
 */
export async function notifyNewChatMessage(chatName: string, chatId: string): Promise<void> {
  await sendPushNotification({
    title: '💬 New Message',
    body: chatName,
    data: {
      type: 'new_message',
      chatId,
    },
  });
}
