/**
 * Baby Monitor API client — talks to the DevBot backend.
 */

import type {
  CameraRecord,
  AlertRecord,
  MonitoringStatus,
  SystemCheck,
  MonitorStats,
  AnalysisResult,
} from './types';
import { BACKEND_URL, authHeaders } from '@devbot/app/lib/api';

const BASE = '/api/plugins/baby-monitor';

async function fetchMonitor<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const babyMonitorApi = {
  // --- Cameras ---
  listCameras: (): Promise<CameraRecord[]> => fetchMonitor('/cameras'),
  getCamera: (id: string): Promise<CameraRecord> => fetchMonitor(`/cameras/${id}`),
  createCamera: (data: Partial<CameraRecord>): Promise<CameraRecord> =>
    fetchMonitor('/cameras', { method: 'POST', body: JSON.stringify(data) }),
  updateCamera: (id: string, data: Partial<CameraRecord>): Promise<CameraRecord> =>
    fetchMonitor(`/cameras/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCamera: (id: string): Promise<{ ok: boolean }> =>
    fetchMonitor(`/cameras/${id}`, { method: 'DELETE' }),

  // --- Snapshots ---
  captureSnapshot: (id: string): Promise<{ ok: boolean; path: string; timestamp: string }> =>
    fetchMonitor(`/cameras/${id}/snapshot`, { method: 'POST' }),
  getSnapshotUrl: (id: string): string =>
    `${BACKEND_URL}${BASE}/cameras/${id}/snapshot?t=${Date.now()}`,

  // --- Analysis ---
  analyzeCamera: (id: string): Promise<AnalysisResult> =>
    fetchMonitor(`/cameras/${id}/analyze`, { method: 'POST' }),

  // --- Alerts ---
  listAlerts: (): Promise<AlertRecord[]> => fetchMonitor('/alerts'),
  acknowledgeAlert: (id: string): Promise<AlertRecord> =>
    fetchMonitor(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  acknowledgeAll: (): Promise<{ ok: boolean; acknowledged: number }> =>
    fetchMonitor('/alerts/acknowledge-all', { method: 'POST' }),
  deleteAlert: (id: string): Promise<{ ok: boolean }> =>
    fetchMonitor(`/alerts/${id}`, { method: 'DELETE' }),

  // --- Monitoring ---
  getMonitoringStatus: (): Promise<MonitoringStatus> => fetchMonitor('/monitoring/status'),
  startMonitoring: (
    interval?: number,
  ): Promise<{ ok: boolean; running: boolean; startedAt: string; interval: number }> =>
    fetchMonitor('/monitoring/start', {
      method: 'POST',
      body: JSON.stringify({ interval: interval ?? 60 }),
    }),
  stopMonitoring: (): Promise<{
    ok: boolean;
    running: boolean;
    checksCount: number;
    alertsCount: number;
  }> => fetchMonitor('/monitoring/stop', { method: 'POST' }),

  // --- System ---
  systemCheck: (): Promise<SystemCheck> => fetchMonitor('/system-check'),
  stats: (): Promise<MonitorStats> => fetchMonitor('/stats'),
};
