/**
 * Notification Service API client.
 *
 * Typed wrappers for the /api/notifications backend endpoints.
 */

import { BACKEND_URL, authHeaders } from './api';

// ─── Types ──────────────────────────────────────────────────────────────

export type NotificationCategory =
  | 'scheduler'
  | 'event'
  | 'chat'
  | 'system'
  | 'reminder'
  | 'custom';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  ttsGenerated: boolean;
  ttsAudioFile: string | null;
  read: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  source: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface NotificationSettings {
  enabled: boolean;
  ttsEnabled: boolean;
  ttsVoice: string;
  enabledCategories: NotificationCategory[];
  minPriority: NotificationPriority;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
}

export interface SendNotificationRequest {
  title: string;
  body: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  speak?: boolean;
  ttsText?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  source?: string;
}

// ─── Fetch helper ───────────────────────────────────────────────────────

async function fetchNotifications<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BACKEND_URL}/api/notifications${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── API ────────────────────────────────────────────────────────────────

export const notificationsApi = {
  /** List notifications with optional filters. */
  list: (params?: {
    category?: NotificationCategory;
    priority?: NotificationPriority;
    read?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<NotificationRecord[]> => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.priority) qs.set('priority', params.priority);
    if (params?.read !== undefined) qs.set('read', String(params.read));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return fetchNotifications(`${q ? `?${q}` : ''}`);
  },

  /** Get unread notification count. */
  unreadCount: (): Promise<{ count: number }> =>
    fetchNotifications('/unread-count'),

  /** Get notification settings. */
  getSettings: (): Promise<NotificationSettings> =>
    fetchNotifications('/settings'),

  /** Update notification settings. */
  updateSettings: (updates: Partial<NotificationSettings>): Promise<NotificationSettings> =>
    fetchNotifications('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  /** Send a notification manually (test or custom). */
  send: (data: SendNotificationRequest): Promise<NotificationRecord> =>
    fetchNotifications('/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Mark a notification as read. */
  markRead: (id: string): Promise<NotificationRecord> =>
    fetchNotifications(`/${id}/read`, { method: 'POST' }),

  /** Mark all notifications as read. */
  markAllRead: (): Promise<{ success: boolean; count: number }> =>
    fetchNotifications('/mark-all-read', { method: 'POST' }),

  /** Delete a notification. */
  delete: (id: string): Promise<{ success: boolean }> =>
    fetchNotifications(`/${id}`, { method: 'DELETE' }),

  /** Get the TTS audio URL for a notification. */
  getTtsAudioUrl: (filename: string): string =>
    `${BACKEND_URL}/api/notifications/tts/${filename}`,

  /** Test TTS synthesis. */
  testTts: (text?: string): Promise<{
    success: boolean;
    notification: NotificationRecord;
    ttsAudioUrl: string | null;
  }> =>
    fetchNotifications('/test-tts', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};
