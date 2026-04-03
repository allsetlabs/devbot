import type {
  BabyLog,
  CreateBabyLogRequest,
  UpdateBabyLogRequest,
  BabyProfile,
  CreateBabyProfileRequest,
  UpdateBabyProfileRequest,
} from './types';

const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT;
const API_KEY = import.meta.env.VITE_API_KEY;

if (!BACKEND_PORT) throw new Error('VITE_BACKEND_PORT is not set. Check your .env file.');
if (!API_KEY) throw new Error('VITE_API_KEY is not set. Check your .env file.');

const BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const babyLogsApi = {
  // Baby Profiles
  listBabyProfiles: (): Promise<BabyProfile[]> => {
    return fetchApi('/api/plugins/baby-logs/profiles');
  },

  getBabyProfile: (id: string): Promise<BabyProfile> => {
    return fetchApi(`/api/plugins/baby-logs/profiles/${id}`);
  },

  createBabyProfile: (data: CreateBabyProfileRequest): Promise<BabyProfile> => {
    return fetchApi('/api/plugins/baby-logs/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBabyProfile: (id: string, data: UpdateBabyProfileRequest): Promise<BabyProfile> => {
    return fetchApi(`/api/plugins/baby-logs/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteBabyProfile: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plugins/baby-logs/profiles/${id}`, { method: 'DELETE' });
  },

  // Baby Logs
  listBabyLogs: (type?: string, limit?: number, offset?: number): Promise<BabyLog[]> => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (limit !== undefined) params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    const qs = params.toString();
    return fetchApi(`/api/plugins/baby-logs/logs${qs ? `?${qs}` : ''}`);
  },

  createBabyLog: (data: CreateBabyLogRequest): Promise<BabyLog> => {
    return fetchApi('/api/plugins/baby-logs/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBabyLog: (id: string, data: UpdateBabyLogRequest): Promise<BabyLog> => {
    return fetchApi(`/api/plugins/baby-logs/logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteBabyLog: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plugins/baby-logs/logs/${id}`, { method: 'DELETE' });
  },
};
