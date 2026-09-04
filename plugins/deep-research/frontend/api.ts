/**
 * Deep Research Plugin — API client.
 */

import { BACKEND_URL, authHeaders } from '@devbot/app/lib/api';
import type { ResearchSession, ResearchSummaryStats } from './types';

const BASE = '/api/plugins/deep-research';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: 'include' as RequestCredentials,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const deepResearchApi = {
  /** List all research sessions. */
  list: (params?: { search?: string; sort?: string; order?: string }): Promise<ResearchSession[]> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.order) qs.set('order', params.order);
    const query = qs.toString();
    return fetchApi(`${BASE}${query ? `?${query}` : ''}`);
  },

  /** Get a single research session. */
  get: (id: string): Promise<ResearchSession> => fetchApi(`${BASE}/${id}`),

  /** Create a new research session (queued, not started). */
  create: (data: {
    topic: string;
    description?: string;
    strategy?: 'breadth' | 'depth';
  }): Promise<ResearchSession> =>
    fetchApi(BASE, { method: 'POST', body: JSON.stringify(data) }),

  /** Create and immediately start a research session. */
  quickStart: (data: {
    topic: string;
    description?: string;
    strategy?: 'breadth' | 'depth';
  }): Promise<ResearchSession> =>
    fetchApi(`${BASE}/quick`, { method: 'POST', body: JSON.stringify(data) }),

  /** Start research for a queued or failed session. */
  start: (id: string): Promise<{ started: boolean; id: string }> =>
    fetchApi(`${BASE}/start/${id}`, { method: 'POST' }),

  /** Cancel an in-progress research session. */
  cancel: (id: string): Promise<{ cancelled: boolean }> =>
    fetchApi(`${BASE}/cancel/${id}`, { method: 'POST' }),

  /** Delete a research session. */
  delete: (id: string): Promise<{ success: boolean }> =>
    fetchApi(`${BASE}/${id}`, { method: 'DELETE' }),

  /** Get the compiled report for a session. */
  getReport: (
    id: string
  ): Promise<{
    id: string;
    topic: string;
    status: string;
    report: string;
    sources: ResearchSession['sources'];
    stats: ResearchSession['stats'];
    completed_at: string;
    duration_ms: number;
  }> => fetchApi(`${BASE}/report/${id}`),

  /** Get aggregate stats across all sessions. */
  stats: (): Promise<ResearchSummaryStats> => fetchApi(`${BASE}/stats/summary`),

  /** List currently active (in-progress) session IDs. */
  active: (): Promise<{ active: string[] }> => fetchApi(`${BASE}/active`),
};
