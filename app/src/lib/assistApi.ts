/**
 * Personal Assistant Mode API client.
 *
 * Typed wrappers for the /api/assist backend endpoints.
 */

import { BACKEND_URL, authHeaders } from './api';

// ─── Types ──────────────────────────────────────────────────────────────

export type AssistRequestStatus = 'pending' | 'replied' | 'expired' | 'cancelled';

export type AssistRequestSource =
  | 'terminal'
  | 'scheduler'
  | 'chat'
  | 'plugin'
  | 'system';

export interface AssistRequest {
  id: string;
  question: string;
  context: string | null;
  source: AssistRequestSource;
  sourceId: string | null;
  sourceLabel: string | null;
  status: AssistRequestStatus;
  reply: string | null;
  repliedAt: string | null;
  ttlSeconds: number;
  notified: boolean;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface CreateAssistRequest {
  question: string;
  context?: string;
  source?: AssistRequestSource;
  sourceId?: string;
  sourceLabel?: string;
  ttlSeconds?: number;
  notify?: boolean;
}

export interface WaitResponse {
  status: AssistRequestStatus;
  reply: string | null;
}

// ─── Fetch helper ───────────────────────────────────────────────────────

async function fetchAssist<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BACKEND_URL}/api/assist${endpoint}`, {
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

export const assistApi = {
  /** List assist requests with optional filters. */
  list: (params?: {
    status?: AssistRequestStatus;
    source?: AssistRequestSource;
    limit?: number;
    search?: string;
  }): Promise<AssistRequest[]> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.source) qs.set('source', params.source);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    const q = qs.toString();
    return fetchAssist(`${q ? `?${q}` : ''}`);
  },

  /** Get pending request count. */
  pendingCount: (): Promise<{ count: number }> =>
    fetchAssist('/pending-count'),

  /** Get a single assist request. */
  get: (id: string): Promise<AssistRequest> =>
    fetchAssist(`/${id}`),

  /** Create a new assist request. */
  create: (data: CreateAssistRequest): Promise<AssistRequest> =>
    fetchAssist('/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Reply to an assist request. */
  reply: (id: string, reply: string): Promise<AssistRequest> =>
    fetchAssist(`/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    }),

  /** Cancel a pending assist request. */
  cancel: (id: string): Promise<AssistRequest> =>
    fetchAssist(`/${id}/cancel`, { method: 'POST' }),

  /** Delete an assist request. */
  delete: (id: string): Promise<{ success: boolean }> =>
    fetchAssist(`/${id}`, { method: 'DELETE' }),
};
