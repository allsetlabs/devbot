/**
 * Trip Planner API client — talks to the DevBot backend.
 *
 * Uses the app's BACKEND_URL + authHeaders for correct resolution across
 * web, mobile (Capacitor), and desktop (Electron).
 */

import type { TripRecord } from './types';
import { BACKEND_URL, authHeaders } from '@devbot/app/lib/api';

const BASE = '/api/plugins/trip-planner';

async function fetchTrips<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${BASE}${endpoint}`, {
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

// ---------------------------------------------------------------------------
// Types for API responses
// ---------------------------------------------------------------------------

export interface TripStats {
  totalTrips: number;
  totalExpenses: number;
  totalBudget: number;
  totalDays: number;
  totalActivities: number;
  byStatus: {
    planning: number;
    booked: number;
    'in-progress': number;
    completed: number;
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const tripPlannerApi = {
  /** List all trips. */
  list: (params?: { search?: string; status?: string; sort?: string; order?: string }): Promise<TripRecord[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);
    const qs = query.toString();
    return fetchTrips(`/${qs ? `?${qs}` : ''}`);
  },

  /** Get a single trip. */
  get: (id: string): Promise<TripRecord> => fetchTrips(`/${id}`),

  /** Create a new trip. */
  create: (data: Partial<TripRecord>): Promise<TripRecord> =>
    fetchTrips('/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a trip (full). */
  update: (id: string, data: Partial<TripRecord>): Promise<TripRecord> =>
    fetchTrips(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Partial update. */
  patch: (id: string, data: Partial<TripRecord>): Promise<TripRecord> =>
    fetchTrips(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete a trip. */
  delete: (id: string): Promise<{ ok: boolean; id: string }> =>
    fetchTrips(`/${id}`, { method: 'DELETE' }),

  /** Export a trip as a downloadable JSON file. */
  exportTrip: async (id: string): Promise<void> => {
    const response = await fetch(`${BACKEND_URL}${BASE}/${id}/export`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** Import a trip from JSON data. */
  importTrip: (data: Record<string, unknown>): Promise<TripRecord> =>
    fetchTrips('/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get aggregate stats. */
  stats: (): Promise<TripStats> => fetchTrips('/stats/summary'),
};
