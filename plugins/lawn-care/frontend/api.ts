import type {
  LawnProfile,
  CreateLawnProfileRequest,
  UpdateLawnProfileRequest,
  LawnPlan,
  LawnPhoto,
  WeatherData,
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

/** Resolve a relative photo URL (e.g. /uploads/lawn-abc.jpg) to an absolute URL */
export function getPhotoUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${BACKEND_URL}${fileUrl}`;
}

export const lawnCareApi = {
  // Lawn Profiles
  listLawnProfiles: (): Promise<LawnProfile[]> => {
    return fetchApi('/api/plugins/lawn-care/profiles');
  },

  getLawnProfile: (id: string): Promise<LawnProfile> => {
    return fetchApi(`/api/plugins/lawn-care/profiles/${id}`);
  },

  createLawnProfile: (data: CreateLawnProfileRequest): Promise<LawnProfile> => {
    return fetchApi('/api/plugins/lawn-care/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLawnProfile: (id: string, data: UpdateLawnProfileRequest): Promise<LawnProfile> => {
    return fetchApi(`/api/plugins/lawn-care/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteLawnProfile: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plugins/lawn-care/profiles/${id}`, { method: 'DELETE' });
  },

  // Lawn Plans
  listLawnPlans: (profileId?: string): Promise<LawnPlan[]> => {
    const params = profileId ? `?profile_id=${profileId}` : '';
    return fetchApi(`/api/plugins/lawn-care/plans${params}`);
  },

  getLawnPlan: (id: string): Promise<LawnPlan> => {
    return fetchApi(`/api/plugins/lawn-care/plans/${id}`);
  },

  getLawnPlanStatus: (
    id: string
  ): Promise<{
    id: string;
    status: string;
    isGenerating: boolean;
    errorMessage: string | null;
  }> => {
    return fetchApi(`/api/plugins/lawn-care/plans/${id}/status`);
  },

  generateLawnPlan: (profileId: string): Promise<LawnPlan> => {
    return fetchApi('/api/plugins/lawn-care/plans/generate', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    });
  },

  deleteLawnPlan: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plugins/lawn-care/plans/${id}`, { method: 'DELETE' });
  },

  // Weather
  getWeather: (zip: string, grassType?: string): Promise<WeatherData> => {
    const params = new URLSearchParams({ zip });
    if (grassType) params.set('grass_type', grassType);
    return fetchApi(`/api/weather?${params}`);
  },

  // Lawn Photos
  listLawnPhotos: (profileId: string): Promise<LawnPhoto[]> => {
    return fetchApi(`/api/plugins/lawn-care/photos?profile_id=${profileId}`);
  },

  uploadLawnPhoto: async (data: {
    profileId: string;
    photo: File;
    caption?: string;
    applicationOrder?: number;
    takenAt?: string;
  }): Promise<LawnPhoto> => {
    const formData = new FormData();
    formData.append('photo', data.photo);
    formData.append('profileId', data.profileId);
    if (data.caption) formData.append('caption', data.caption);
    if (data.applicationOrder !== undefined)
      formData.append('applicationOrder', String(data.applicationOrder));
    if (data.takenAt) formData.append('takenAt', data.takenAt);

    const response = await fetch(`${BACKEND_URL}/api/plugins/lawn-care/photos`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  updateLawnPhoto: (
    id: string,
    data: { caption?: string; applicationOrder?: number | null }
  ): Promise<LawnPhoto> => {
    return fetchApi(`/api/plugins/lawn-care/photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteLawnPhoto: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plugins/lawn-care/photos/${id}`, { method: 'DELETE' });
  },
};
