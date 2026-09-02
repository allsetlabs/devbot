/**
 * Health Tracker API client — talks to the DevBot backend.
 *
 * Uses the app's BACKEND_URL + authHeaders for correct resolution across
 * web, mobile (Capacitor), and desktop (Electron).
 */

import type {
  MemberRecord,
  MedicationRecord,
  AppointmentRecord,
  DashboardData,
  TodaySchedule,
} from './types';
import { BACKEND_URL, authHeaders } from '@devbot/app/lib/api';

const BASE = '/api/plugins/health-tracker';

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchHealth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
// Query-string builder
// ---------------------------------------------------------------------------

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const healthApi = {
  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  /** Get aggregated dashboard data. */
  dashboard: (): Promise<DashboardData> => fetchHealth('/dashboard'),

  /** Get today's medication schedule. */
  todaySchedule: (): Promise<TodaySchedule> => fetchHealth('/medications/today'),

  // -------------------------------------------------------------------------
  // Members
  // -------------------------------------------------------------------------

  /** List members with optional filters. */
  listMembers: (params?: {
    search?: string;
    sort?: string;
    order?: string;
  }): Promise<MemberRecord[]> =>
    fetchHealth(`/members${buildQuery(params)}`),

  /** Get a single member. */
  getMember: (id: string): Promise<MemberRecord> =>
    fetchHealth(`/members/${id}`),

  /** Create a new member. */
  createMember: (data: Partial<MemberRecord>): Promise<MemberRecord> =>
    fetchHealth('/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a member. */
  updateMember: (id: string, data: Partial<MemberRecord>): Promise<MemberRecord> =>
    fetchHealth(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a member. */
  deleteMember: (id: string): Promise<void> =>
    fetchHealth(`/members/${id}`, { method: 'DELETE' }),

  /** Get member summary with medications and appointments. */
  memberSummary: (memberId: string) =>
    fetchHealth<{ member: MemberRecord; medications: MedicationRecord[]; appointments: AppointmentRecord[] }>(
      `/member/${memberId}/summary`
    ),

  // -------------------------------------------------------------------------
  // Medications
  // -------------------------------------------------------------------------

  /** List medications with optional filters. */
  listMedications: (params?: {
    search?: string;
    sort?: string;
    order?: string;
    memberId?: string;
  }): Promise<MedicationRecord[]> =>
    fetchHealth(`/medications${buildQuery(params)}`),

  /** Get a single medication. */
  getMedication: (id: string): Promise<MedicationRecord> =>
    fetchHealth(`/medications/${id}`),

  /** Create a new medication. */
  createMedication: (data: Partial<MedicationRecord>): Promise<MedicationRecord> =>
    fetchHealth('/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a medication. */
  updateMedication: (id: string, data: Partial<MedicationRecord>): Promise<MedicationRecord> =>
    fetchHealth(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a medication. */
  deleteMedication: (id: string): Promise<void> =>
    fetchHealth(`/medications/${id}`, { method: 'DELETE' }),

  // -------------------------------------------------------------------------
  // Appointments
  // -------------------------------------------------------------------------

  /** List appointments with optional filters. */
  listAppointments: (params?: {
    search?: string;
    sort?: string;
    order?: string;
    memberId?: string;
    status?: string;
  }): Promise<AppointmentRecord[]> =>
    fetchHealth(`/appointments${buildQuery(params)}`),

  /** Get a single appointment. */
  getAppointment: (id: string): Promise<AppointmentRecord> =>
    fetchHealth(`/appointments/${id}`),

  /** Create a new appointment. */
  createAppointment: (data: Partial<AppointmentRecord>): Promise<AppointmentRecord> =>
    fetchHealth('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an appointment. */
  updateAppointment: (id: string, data: Partial<AppointmentRecord>): Promise<AppointmentRecord> =>
    fetchHealth(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete an appointment. */
  deleteAppointment: (id: string): Promise<void> =>
    fetchHealth(`/appointments/${id}`, { method: 'DELETE' }),
};

/** Alias — pages import this name. */
export const healthTrackerApi = healthApi;
