import type {
  Session,
  CreateSessionResponse,
  HealthResponse,
  DoctorResponse,
  ScheduledTask,
  CreateScheduledTaskRequest,
  UpdateScheduledTaskRequest,
  TaskRun,
  TaskMessage,
  InteractiveChat,
  ChatMessage,
  PermissionMode,
  ClaudeModel,
  EventTimerEntry,
  ModulePlan,
  CreateModulePlanRequest,
  UpdateModulePlanRequest,
  LogsResponse,
  RemotionVideo,
  CreateRemotionVideoRequest,
  SlashCommand,
  WorkflowRun,
  WorkflowStepRun,
  WorkingDirectory,
  Company,
  FeedbackDocument,
  FileBrowseItem,
  MessageSearchResult,
  QueuedMessage,
  OcrDocument,
  OcrUploadResponse,
  UnifiedDirsResponse,
  UnifiedSession,
  UnifiedChatResponse,
  EventSource,
  CreateEventSourceRequest,
  UpdateEventSourceRequest,
  EventTaskLink,
  EventSourceTestResult,
  CLIProvider,
  ProvidersResponse,
  AllSessionsResponse,
  ProviderSessionDetail,
  FileStoreInfo,
  FileStoreDetail,
  FileStoreRecord,
  AuthTokenInfo,
  AuthTokenCreateResponse,
} from '../types';

import {
  VITE_BACKEND_PORT as BACKEND_PORT,
  VITE_API_KEY as API_KEY,
  VITE_BACKEND_URL,
} from './env';
import { isNative, isElectron, getBackendUrlSync } from './capacitor';

/**
 * Resolve the backend URL. Priority:
 * 1. Runtime-configured URL (native mobile — stored in localStorage via Capacitor Preferences)
 * 2. Electron desktop — localhost with injected or default port
 * 3. Build-time VITE_BACKEND_URL env var (for mobile builds with a known server)
 * 4. Construct from window.location (web mode — same host, different port)
 */
function resolveBackendUrl(): string {
  // Native mobile: check for runtime-configured URL
  if (isNative) {
    const stored = getBackendUrlSync();
    if (stored) return stored.replace(/\/$/, '');
  }

  // Electron desktop: backend runs locally on the same machine
  if (isElectron) {
    const port = window.__ELECTRON_BACKEND_PORT__ || BACKEND_PORT || '3100';
    return `https://localhost:${port}`;
  }

  // Build-time override (useful for Capacitor builds with known backend)
  if (VITE_BACKEND_URL) return VITE_BACKEND_URL.replace(/\/$/, '');

  // Web mode: derive from current page location
  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
}

export let BACKEND_URL = resolveBackendUrl();

/** Re-resolve the backend URL (call after the user changes it in Settings). */
export function refreshBackendUrl(): void {
  BACKEND_URL = resolveBackendUrl();
}

/**
 * Build auth headers. Sends X-API-Key when available (backward compat),
 * and always includes credentials: 'include' for session cookies.
 */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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

export const api = {
  health: (): Promise<HealthResponse> => {
    return fetchApi('/health');
  },

  doctor: (): Promise<DoctorResponse> => {
    return fetchApi('/api/doctor');
  },

  listSessions: (): Promise<Session[]> => {
    return fetchApi('/api/sessions');
  },

  getSession: (id: string): Promise<Session> => {
    return fetchApi(`/api/sessions/${id}`);
  },

  createSession: (): Promise<CreateSessionResponse> => {
    return fetchApi('/api/sessions', {
      method: 'POST',
    });
  },

  deleteSession: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  renameSession: (id: string, name: string): Promise<Session> => {
    return fetchApi(`/api/sessions/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  // Scheduler endpoints
  listScheduledTasks: (): Promise<ScheduledTask[]> => {
    return fetchApi('/api/schedulers');
  },

  getScheduledTask: (id: string): Promise<ScheduledTask> => {
    return fetchApi(`/api/schedulers/${id}`);
  },

  createScheduledTask: (data: CreateScheduledTaskRequest): Promise<ScheduledTask> => {
    return fetchApi('/api/schedulers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateScheduledTask: (id: string, data: UpdateScheduledTaskRequest): Promise<ScheduledTask> => {
    return fetchApi(`/api/schedulers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteScheduledTask: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/schedulers/${id}`, {
      method: 'DELETE',
    });
  },

  rerunScheduledTask: (id: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi(`/api/schedulers/${id}/rerun`, { method: 'POST' });
  },

  // Run endpoints
  listTaskRuns: (taskId: string): Promise<TaskRun[]> => {
    return fetchApi(`/api/schedulers/${taskId}/runs`);
  },

  getLatestRun: (taskId: string): Promise<TaskRun> => {
    return fetchApi(`/api/schedulers/${taskId}/latest-run`);
  },

  getTaskRun: (taskId: string, runId: string): Promise<TaskRun> => {
    return fetchApi(`/api/schedulers/${taskId}/runs/${runId}`);
  },

  getRunMessages: (taskId: string, runId: string, afterSequence = 0): Promise<TaskMessage[]> => {
    const params = afterSequence > 0 ? `?afterSequence=${afterSequence}` : '';
    return fetchApi(`/api/schedulers/${taskId}/runs/${runId}/messages${params}`);
  },

  // Event Source endpoints
  listEventSources: (): Promise<EventSource[]> => {
    return fetchApi('/api/event-sources');
  },

  getEventSource: (id: string): Promise<EventSource> => {
    return fetchApi(`/api/event-sources/${id}`);
  },

  createEventSource: (data: CreateEventSourceRequest): Promise<EventSource> => {
    return fetchApi('/api/event-sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEventSource: (id: string, data: UpdateEventSourceRequest): Promise<EventSource> => {
    return fetchApi(`/api/event-sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEventSource: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/event-sources/${id}`, {
      method: 'DELETE',
    });
  },

  linkTaskToEventSource: (sourceId: string, taskId: string): Promise<EventTaskLink> => {
    return fetchApi(`/api/event-sources/${sourceId}/link-task`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  },

  unlinkTaskFromEventSource: (sourceId: string, linkId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/event-sources/${sourceId}/link-task/${linkId}`, {
      method: 'DELETE',
    });
  },

  testEventSource: (id: string): Promise<EventSourceTestResult> => {
    return fetchApi(`/api/event-sources/${id}/test`, {
      method: 'POST',
    });
  },

  // Interactive Chat endpoints
  listChatTypes: (): Promise<string[]> => {
    return fetchApi('/api/interactive-chats/types');
  },

  fetchPinnedMessages: (
    pins: { chatId: string; messageIds: string[] }[]
  ): Promise<{ chatId: string; chatName: string; messages: ChatMessage[] }[]> => {
    return fetchApi('/api/interactive-chats/pinned-messages', {
      method: 'POST',
      body: JSON.stringify({ pins }),
    });
  },

  listInteractiveChats: (type?: string): Promise<InteractiveChat[]> => {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    return fetchApi(`/api/interactive-chats${params}`);
  },

  searchMessages: (q: string): Promise<MessageSearchResult[]> =>
    fetchApi(`/api/interactive-chats/search-messages?q=${encodeURIComponent(q)}`),

  getInteractiveChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}`);
  },

  createInteractiveChat: (options?: {
    name?: string;
    systemPrompt?: string;
    permissionMode?: PermissionMode;
    model?: ClaudeModel;
    workingDir?: string;
  }): Promise<InteractiveChat> => {
    return fetchApi('/api/interactive-chats', {
      method: 'POST',
      body: options ? JSON.stringify(options) : undefined,
    });
  },

  duplicateInteractiveChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/duplicate`, {
      method: 'POST',
    });
  },

  deleteInteractiveChat: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${id}`, { method: 'DELETE' });
  },

  sendChatMessage: (chatId: string, prompt: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/send`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  truncateMessagesAfter: (chatId: string, sequence: number): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/truncate-after`, {
      method: 'POST',
      body: JSON.stringify({ sequence }),
    });
  },

  stopChat: (chatId: string): Promise<{ success: boolean; wasStopped: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/stop`, { method: 'POST' });
  },

  pauseChat: (chatId: string): Promise<{ success: boolean; wasPaused: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/pause`, { method: 'POST' });
  },

  resumeChat: (chatId: string): Promise<{ success: boolean; wasResumed: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/resume`, { method: 'POST' });
  },

  getChatStatus: (chatId: string): Promise<{ isRunning: boolean; isPaused: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/status`);
  },

  getChatQueue: (chatId: string): Promise<QueuedMessage[]> => {
    return fetchApi(`/api/interactive-chats/${chatId}/queue`);
  },

  queueChatMessage: (chatId: string, prompt: string): Promise<QueuedMessage> => {
    return fetchApi(`/api/interactive-chats/${chatId}/queue`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  removeQueuedMessage: (chatId: string, queueId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/queue/${queueId}`, { method: 'DELETE' });
  },

  sendQueuedMessage: (chatId: string, queueId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/queue/${queueId}/send`, { method: 'POST' });
  },

  sendAllQueuedMessages: (chatId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/queue/send-all`, { method: 'POST' });
  },

  getChatMessages: (chatId: string, afterSequence = 0): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    if (afterSequence > 0) params.set('afterSequence', String(afterSequence));
    const qs = params.toString();
    return fetchApi(`/api/interactive-chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
  },

  renameInteractiveChat: (id: string, name: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  autoNameChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/auto-name`, { method: 'POST' });
  },

  listArchivedChats: (type?: string): Promise<InteractiveChat[]> => {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    return fetchApi(`/api/interactive-chats/archived${params}`);
  },

  archiveInteractiveChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/archive`, { method: 'POST' });
  },

  unarchiveInteractiveChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/unarchive`, { method: 'POST' });
  },

  starInteractiveChat: (id: string, starred: boolean): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/star`, {
      method: 'POST',
      body: JSON.stringify({ starred }),
    });
  },

  changeChatMode: (id: string, permissionMode: PermissionMode): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/mode`, {
      method: 'POST',
      body: JSON.stringify({ permissionMode }),
    });
  },

  changeChatModel: (id: string, model: ClaudeModel): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/model`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
  },

  updateChatSystemPrompt: (id: string, systemPrompt: string | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/system-prompt`, {
      method: 'POST',
      body: JSON.stringify({ systemPrompt }),
    });
  },

  changeChatEffort: (id: string, effort: string | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/effort`, {
      method: 'POST',
      body: JSON.stringify({ effort }),
    });
  },

  toggleChatFastMode: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/fast-mode`, {
      method: 'POST',
    });
  },

  changeChatWorkingDir: (id: string, workingDir: string | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/working-dir`, {
      method: 'POST',
      body: JSON.stringify({ workingDir }),
    });
  },

  exportChat: async (
    id: string,
    format: 'markdown' | 'json' | 'plaintext' = 'markdown'
  ): Promise<Blob> => {
    const response = await fetch(
      `${BACKEND_URL}/api/interactive-chats/${id}/export?format=${format}`,
      {
        credentials: 'include',
        headers: authHeaders(),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.blob();
  },

  exportChatMarkdown: async (id: string): Promise<string> => {
    // Keep for backwards compatibility
    const blob = await api.exportChat(id, 'markdown');
    return blob.text();
  },

  // Event Timer (Birth Times) endpoints
  listEventTimerEntries: (): Promise<EventTimerEntry[]> => {
    return fetchApi('/api/birth-times');
  },

  createEventTimerEntry: (data: {
    recordedAt: string;
    timezone: string;
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    fullAddress?: string | null;
  }): Promise<EventTimerEntry> => {
    return fetchApi('/api/birth-times', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEventTimerEntry: (
    id: string,
    data: { name?: string | null; description?: string | null }
  ): Promise<EventTimerEntry> => {
    return fetchApi(`/api/birth-times/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteEventTimerEntry: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/birth-times/${id}`, { method: 'DELETE' });
  },

  // Plans endpoints
  listPlans: (status?: string): Promise<ModulePlan[]> => {
    const params = status ? `?status=${status}` : '';
    return fetchApi(`/api/plans${params}`);
  },

  getPlanCount: (): Promise<{ count: number }> => {
    return fetchApi('/api/plans/count');
  },

  getPlan: (id: string): Promise<ModulePlan> => {
    return fetchApi(`/api/plans/${id}`);
  },

  createPlan: (data: CreateModulePlanRequest): Promise<ModulePlan> => {
    return fetchApi('/api/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePlan: (id: string, data: UpdateModulePlanRequest): Promise<ModulePlan> => {
    return fetchApi(`/api/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePlan: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/plans/${id}`, { method: 'DELETE' });
  },

  // Remotion Videos endpoints
  listRemotionVideos: (): Promise<RemotionVideo[]> => {
    return fetchApi('/api/remotion-videos');
  },

  createRemotionVideo: (data: CreateRemotionVideoRequest): Promise<RemotionVideo> => {
    return fetchApi('/api/remotion-videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteRemotionVideo: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/remotion-videos/${id}`, { method: 'DELETE' });
  },

  getRemotionVideoStreamUrl: (id: string): string => {
    // Cookie auth handles this automatically; API key is a fallback for direct links
    const keyParam = API_KEY ? `?key=${encodeURIComponent(API_KEY)}` : '';
    return `${BACKEND_URL}/api/remotion-videos/${id}/stream${keyParam}`;
  },

  // Commands endpoints
  listCommands: (dir?: string): Promise<SlashCommand[]> => {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    return fetchApi(`/api/commands${params}`);
  },

  // Logs endpoints
  getLogs: (source: string, lines = 200): Promise<LogsResponse> => {
    return fetchApi(`/api/logs?source=${source}&lines=${lines}`);
  },

  clearLogs: (source: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/logs?source=${source}`, { method: 'DELETE' });
  },

  // Workflow endpoints
  getWorkflow: async (workflowId: string): Promise<{ id: string; name: string }> =>
    fetchApi(`/api/workflows/${workflowId}`),
  listWorkflowRuns: async (workflowId: string): Promise<WorkflowRun[]> =>
    fetchApi(`/api/workflows/${workflowId}/runs`),
  listWorkflowStepRuns: async (workflowId: string, runId: string): Promise<WorkflowStepRun[]> =>
    fetchApi(`/api/workflows/${workflowId}/runs/${runId}/steps`),
  startWorkflowRun: async (workflowId: string): Promise<WorkflowRun> =>
    fetchApi(`/api/workflows/${workflowId}/runs`, { method: 'POST' }),
  cancelWorkflowRun: async (workflowId: string, runId: string): Promise<WorkflowRun> =>
    fetchApi(`/api/workflows/${workflowId}/runs/${runId}/cancel`, { method: 'POST' }),
  getWorkflowStepMessages: async (
    workflowId: string,
    runId: string,
    stepRunId: string,
    afterSequence: number
  ): Promise<TaskMessage[]> =>
    fetchApi(
      `/api/workflows/${workflowId}/runs/${runId}/steps/${stepRunId}/messages?after=${afterSequence}`
    ),

  // Working directories endpoints
  listWorkingDirectories: (): Promise<WorkingDirectory[]> => {
    return fetchApi('/api/working-directories');
  },

  createWorkingDirectory: (path: string, label?: string): Promise<WorkingDirectory> => {
    return fetchApi('/api/working-directories', {
      method: 'POST',
      body: JSON.stringify({ path, label }),
    });
  },

  validateWorkingDirectory: (path: string): Promise<{ valid: boolean; resolvedPath: string }> => {
    return fetchApi('/api/working-directories/validate', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  deleteWorkingDirectory: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/working-directories/${id}`, { method: 'DELETE' });
  },

  // Companies endpoints
  listCompanies: (): Promise<Company[]> => {
    return fetchApi('/api/companies');
  },

  getCompany: (id: string): Promise<Company> => {
    return fetchApi(`/api/companies/${id}`);
  },

  createCompany: (data: { name: string; idea: string }): Promise<Company> => {
    return fetchApi('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteCompany: (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/companies/${id}`, { method: 'DELETE' });
  },

  getCompanyFeedback: (companyId: string, type: 'user' | 'investor'): Promise<FeedbackDocument> => {
    return fetchApi(`/api/companies/${companyId}/feedback/${type}`);
  },

  addCompanyFeedback: (
    companyId: string,
    type: 'user' | 'investor',
    prompt: string
  ): Promise<FeedbackDocument> => {
    return fetchApi(`/api/companies/${companyId}/feedback/${type}`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // CLAUDE.md endpoints
  getClaudeMd: (
    dir: string
  ): Promise<{ content: string | null; path: string; exists: boolean }> => {
    return fetchApi(`/api/claude-md?dir=${encodeURIComponent(dir)}`);
  },

  saveClaudeMd: (dir: string, content: string): Promise<{ success: boolean; path: string }> => {
    return fetchApi('/api/claude-md', {
      method: 'PUT',
      body: JSON.stringify({ dir, content }),
    });
  },

  // Files endpoints
  browseFiles: (
    query: string,
    offset = 0,
    limit = 50,
    workingDir?: string
  ): Promise<{ items: FileBrowseItem[]; total: number; hasMore: boolean }> => {
    const params = new URLSearchParams({ q: query, offset: String(offset), limit: String(limit) });
    if (workingDir) params.set('workingDir', workingDir);
    return fetchApi(`/api/files/browse?${params.toString()}`);
  },

  readFile: (
    filePath: string,
    workingDir?: string
  ): Promise<{ content: string; size: number; path: string }> => {
    const params = new URLSearchParams({ path: filePath });
    if (workingDir) params.set('workingDir', workingDir);
    return fetchApi(`/api/files/read?${params.toString()}`);
  },

  writeFile: (
    filePath: string,
    content: string,
    workingDir?: string
  ): Promise<{ success: boolean; path: string }> => {
    return fetchApi('/api/files/write', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content, workingDir }),
    });
  },

  // File Store endpoints
  listFileStores: (): Promise<FileStoreInfo[]> => fetchApi('/api/file-stores'),

  getFileStore: (name: string): Promise<FileStoreDetail> =>
    fetchApi(`/api/file-stores/${encodeURIComponent(name)}`),

  listFileStoreRecords: (
    name: string,
    params?: { search?: string; sort?: string; order?: 'asc' | 'desc'; limit?: number; offset?: number }
  ): Promise<FileStoreRecord[]> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.order) qs.set('order', params.order);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const q = qs.toString();
    return fetchApi(`/api/file-stores/${encodeURIComponent(name)}/records${q ? `?${q}` : ''}`);
  },

  getFileStoreRecord: (name: string, id: string): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${encodeURIComponent(name)}/records/${id}`),

  createFileStoreRecord: (name: string, data: Record<string, unknown>): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${encodeURIComponent(name)}/data`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateFileStoreRecord: (
    name: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${encodeURIComponent(name)}/data/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteFileStoreRecord: (
    name: string,
    id: string
  ): Promise<{ ok: boolean; id: string }> =>
    fetchApi(`/api/file-stores/${encodeURIComponent(name)}/data/${id}`, {
      method: 'DELETE',
    }),

};

export function getXtermWsUrl(port: number): string {
  // In native mode, derive WebSocket host from the configured backend URL
  if (isNative) {
    const stored = getBackendUrlSync();
    if (stored) {
      try {
        const url = new URL(stored);
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${url.hostname}:${port}`;
      } catch {
        // Fall through to default
      }
    }
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.hostname}:${port}`;
}

export interface UploadedFileInfo {
  path: string;
  filename: string;
  originalName: string;
}

export interface UploadResponse {
  success: boolean;
  path: string;
  filename: string;
  originalName?: string;
  files: UploadedFileInfo[];
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  return uploadFiles([file]);
}

export async function uploadFiles(files: File[], chatId?: string): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (chatId) {
    formData.append('chatId', chatId);
  }

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/** @deprecated Use uploadFile instead */
export const uploadImage = uploadFile;

// OCR API

export async function listOcrDocuments(): Promise<OcrDocument[]> {
  return fetchApi('/api/ocr');
}

export async function getOcrDocument(id: string): Promise<OcrDocument> {
  return fetchApi(`/api/ocr/${id}`);
}

export async function uploadOcrImage(file: File): Promise<OcrUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/ocr/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error((error as { error: string }).error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<OcrUploadResponse>;
}

export async function saveOcrText(id: string, text: string): Promise<OcrDocument> {
  return fetchApi(`/api/ocr/${id}/text`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export async function deleteOcrDocument(id: string): Promise<void> {
  await fetchApi(`/api/ocr/${id}`, { method: 'DELETE' });
}

export interface SttStatusResponse {
  available: boolean;
  model: string | null;
  ollama?: { available: boolean; model: string };
  correctionsCount?: number;
  dictionaryPath?: string;
}

export interface SttTranscribeResponse {
  transcript: string;
  rawTranscript?: string;
}

export interface SttLearnResponse {
  learned: boolean;
  reason?: string;
  replacements?: Record<string, string[]>;
  summary?: string;
  totalCorrections?: number;
}

export interface SttCorrectionsResponse {
  corrections: Record<string, string[]>;
  count: number;
  path: string;
}

export type SttModelId = 'tiny' | 'small.en' | 'small';

export interface SttModelSettingsResponse {
  selected: SttModelId;
  models: Array<{ id: SttModelId; installed: boolean }>;
}

export async function sttStatus(): Promise<SttStatusResponse> {
  return fetchApi('/api/stt/status');
}

export async function sttGetModel(): Promise<SttModelSettingsResponse> {
  return fetchApi('/api/stt/model');
}

export async function sttSelectModel(model: SttModelId): Promise<SttModelSettingsResponse> {
  return fetchApi('/api/stt/model', { method: 'PUT', body: JSON.stringify({ model }) });
}

export async function sttInstallModel(model: SttModelId): Promise<void> {
  await fetchApi('/api/stt/model/install', { method: 'POST', body: JSON.stringify({ model }) });
}

export async function sttTranscribe(audioBlob: Blob): Promise<SttTranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${BACKEND_URL}/api/stt/transcribe`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Transcription failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function sttLearn(sttOutput: string, finalMessage: string): Promise<SttLearnResponse> {
  return fetchApi('/api/stt/learn', {
    method: 'POST',
    body: JSON.stringify({ sttOutput, finalMessage }),
  });
}

export async function sttGetCorrections(): Promise<SttCorrectionsResponse> {
  return fetchApi('/api/stt/corrections');
}

export async function sttUpdateCorrections(
  replacements: Record<string, string[]>
): Promise<SttCorrectionsResponse> {
  return fetchApi('/api/stt/corrections', {
    method: 'PUT',
    body: JSON.stringify({ replacements }),
  });
}

export const unifiedChatApi = {
  listDirs: (): Promise<UnifiedDirsResponse> =>
    fetchApi('/api/unified-chat/dirs'),

  listSessions: (encoded: string): Promise<UnifiedSession[]> =>
    fetchApi(`/api/unified-chat/dirs/${encodeURIComponent(encoded)}/sessions`),

  getSession: (encoded: string, sessionId: string): Promise<UnifiedChatResponse> =>
    fetchApi(`/api/unified-chat/dirs/${encodeURIComponent(encoded)}/sessions/${sessionId}`),

  getDefaultDir: (): Promise<{ defaultDir: string | null }> =>
    fetchApi('/api/unified-chat/default-dir'),

  setDefaultDir: (encoded: string | null): Promise<{ defaultDir: string | null }> =>
    fetchApi('/api/unified-chat/default-dir', {
      method: 'POST',
      body: JSON.stringify({ encoded }),
    }),

  openSession: (
    sessionId: string,
    cwd: string,
    name: string
  ): Promise<{ chatId: string }> =>
    fetchApi('/api/unified-chat/open-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId, cwd, name }),
    }),

  deleteSession: (encoded: string, sessionId: string): Promise<{ success: boolean }> =>
    fetchApi(
      `/api/unified-chat/dirs/${encodeURIComponent(encoded)}/sessions/${sessionId}`,
      { method: 'DELETE' }
    ),

  getFavorites: (): Promise<{ sessionIds: string[] }> =>
    fetchApi('/api/unified-chat/favorites'),

  toggleFavorite: (sessionId: string): Promise<{ favorited: boolean }> =>
    fetchApi(`/api/unified-chat/favorites/${sessionId}/toggle`, { method: 'POST' }),

  searchSessions: (encoded: string, q: string): Promise<UnifiedSession[]> =>
    fetchApi(`/api/unified-chat/dirs/${encodeURIComponent(encoded)}/search?q=${encodeURIComponent(q)}`),

  // Multi-provider CLI Dashboard endpoints
  listProviders: (): Promise<ProvidersResponse> =>
    fetchApi('/api/unified-chat/providers'),

  listAllSessions: (provider?: CLIProvider, limit?: number, q?: string): Promise<AllSessionsResponse> => {
    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (limit) params.set('limit', String(limit));
    if (q) params.set('q', q);
    const qs = params.toString();
    return fetchApi(`/api/unified-chat/all-sessions${qs ? `?${qs}` : ''}`);
  },

  getProviderSession: (provider: CLIProvider, sessionId: string, projectDir?: string): Promise<ProviderSessionDetail> => {
    const params = projectDir ? `?projectDir=${encodeURIComponent(projectDir)}` : '';
    return fetchApi(`/api/unified-chat/session/${provider}/${encodeURIComponent(sessionId)}${params}`);
  },

  refreshCache: (): Promise<{ success: boolean }> =>
    fetchApi('/api/unified-chat/refresh-cache', { method: 'POST' }),
};

// File Stores API
export const fileStoresApi = {
  /** List all registered file stores with metadata. */
  listStores: (): Promise<FileStoreInfo[]> =>
    fetchApi('/api/file-stores'),

  /** Get a store's info + all records. */
  getStore: (name: string): Promise<FileStoreDetail> =>
    fetchApi(`/api/file-stores/${name}`),

  /** List records from a specific store with optional query params. */
  listRecords: (name: string, params?: { search?: string; sort?: string; order?: string }): Promise<FileStoreRecord[]> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.order) qs.set('order', params.order);
    const q = qs.toString();
    return fetchApi(`/api/file-stores/${name}/records${q ? `?${q}` : ''}`);
  },

  /** Get a single record from a store. */
  getRecord: (name: string, id: string): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${name}/records/${id}`),

  /** Create a record in a store's data endpoint. */
  createRecord: (name: string, data: Record<string, unknown>): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${name}/data`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update a record in a store's data endpoint. */
  updateRecord: (name: string, id: string, data: Record<string, unknown>): Promise<FileStoreRecord> =>
    fetchApi(`/api/file-stores/${name}/data/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a record from a store's data endpoint. */
  deleteRecord: (name: string, id: string): Promise<{ ok: boolean; id: string }> =>
    fetchApi(`/api/file-stores/${name}/data/${id}`, { method: 'DELETE' }),
};

// ── Auth Token Management API ────────────────────────────────────────
// Auth routes are mounted at /auth/* (outside /api/*), so we use BACKEND_URL directly.

export const authApi = {
  /** List all API tokens (masked). */
  listTokens: (): Promise<AuthTokenInfo[]> =>
    fetchApi('/auth/tokens'),

  /** Create a new API token. Returns the full token (shown only once). */
  createToken: (name: string): Promise<AuthTokenCreateResponse> =>
    fetchApi('/auth/tokens', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  /** Revoke an API token by its last-8-char ID. */
  deleteToken: (id: string): Promise<{ success: boolean }> =>
    fetchApi(`/auth/tokens/${id}`, { method: 'DELETE' }),
};

// ── Push Notification Token Management API ─────────────────────────────
export const pushApi = {
  /** Register a device push token with the backend. */
  registerToken: (
    token: string,
    platform: string,
    deviceName?: string
  ): Promise<{ success: boolean; id: string }> =>
    fetchApi('/api/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform, deviceName }),
    }),

  /** Unregister a device push token. */
  unregisterToken: (token: string): Promise<{ success: boolean }> =>
    fetchApi('/api/push/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  /** List registered push tokens. */
  listTokens: (): Promise<Array<{
    id: string;
    platform: string;
    deviceName: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>> =>
    fetchApi('/api/push/tokens'),

  /** Send a test push notification to all registered devices. */
  testPush: (title: string, body: string): Promise<{ success: boolean; sent: number }> =>
    fetchApi('/api/push/test', {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    }),
};

// ── Cloudflare Tunnel API ───────────────────────────────────────────────

export interface TunnelStatusResponse {
  status: 'stopped' | 'starting' | 'running' | 'error';
  mode: 'quick' | 'named' | null;
  publicUrl: string | null;
  hostname: string | null;
  connectedAt: string | null;
  error: string | null;
  pid: number | null;
  installed: boolean;
  version: string | null;
  metrics: {
    connections: number;
    uptimeSeconds: number;
  };
}

export interface TunnelStartRequest {
  mode?: 'quick' | 'named';
  token?: string;
  hostname?: string;
  localPort?: number;
  localProtocol?: 'http' | 'https';
}

export const tunnelApi = {
  /** Get current tunnel status, install info, and metrics. */
  getStatus: (): Promise<TunnelStatusResponse> =>
    fetchApi('/api/tunnel/status'),

  /** Get recent cloudflared log lines. */
  getLogs: (limit = 100): Promise<{ logs: string[]; count: number }> =>
    fetchApi(`/api/tunnel/logs?limit=${limit}`),

  /** Start the cloudflared tunnel. */
  start: (config?: TunnelStartRequest): Promise<TunnelStatusResponse & { success: boolean }> =>
    fetchApi('/api/tunnel/start', {
      method: 'POST',
      body: JSON.stringify(config ?? { mode: 'quick' }),
    }),

  /** Stop the cloudflared tunnel. */
  stop: (): Promise<{ success: boolean; status: string }> =>
    fetchApi('/api/tunnel/stop', { method: 'POST' }),
};

// ── TTS (Text-to-Speech) ──────────────────────────────────────────────────

export interface TtsVoice {
  id: string;
  gender: string;
  locale: string;
}

export interface TtsStatusResponse {
  available: boolean;
  voice: string;
}

export interface TtsVoicesResponse {
  voices: TtsVoice[];
}

export async function ttsStatus(): Promise<TtsStatusResponse> {
  return fetchApi('/api/tts/status');
}

export async function ttsListVoices(): Promise<TtsVoicesResponse> {
  return fetchApi('/api/tts/voices');
}

export async function ttsSelectVoice(voice: string): Promise<{ voice: string }> {
  return fetchApi('/api/tts/voice', { method: 'PUT', body: JSON.stringify({ voice }) });
}

export async function ttsSynthesize(text: string, voice?: string): Promise<Blob> {
  const response = await fetch(`${BACKEND_URL}/api/tts/synthesize`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'TTS synthesis failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.blob();
}

// ── Voice Mode ────────────────────────────────────────────────────────────

export interface VoiceSession {
  id: string;
  systemPrompt: string;
  createdAt: string;
  lastActiveAt: string;
  messageCount?: number;
}

export interface VoiceMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface VoiceSessionDetail extends VoiceSession {
  messages: VoiceMessage[];
}

export interface VoiceRespondResponse {
  text: string;
  messageIndex: number;
}

export const voiceApi = {
  createSession: (systemPrompt?: string): Promise<VoiceSession> =>
    fetchApi('/api/voice/sessions', {
      method: 'POST',
      body: JSON.stringify({ systemPrompt }),
    }),

  endSession: (id: string): Promise<{ deleted: boolean }> =>
    fetchApi(`/api/voice/sessions/${id}`, { method: 'DELETE' }),

  getSession: (id: string): Promise<VoiceSessionDetail> =>
    fetchApi(`/api/voice/sessions/${id}`),

  listSessions: (): Promise<VoiceSession[]> =>
    fetchApi('/api/voice/sessions'),

  respond: (id: string, text: string, model?: string, rawStt?: string): Promise<VoiceRespondResponse> =>
    fetchApi(`/api/voice/sessions/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ text, model, ...(rawStt && rawStt !== text ? { rawStt } : {}) }),
    }),

  clearHistory: (id: string): Promise<{ cleared: boolean }> =>
    fetchApi(`/api/voice/sessions/${id}/clear`, { method: 'POST' }),
};

// ── Voice Transcripts ─────────────────────────────────────────────────────

export interface VoiceTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  rawStt?: string;
  timestamp: string;
}

export interface VoiceTranscript {
  id: string;
  sessionId: string;
  messages: VoiceTranscriptMessage[];
  messageCount: number;
  durationSeconds: number;
  sessionStartedAt: string;
  sessionEndedAt: string;
  analyzed: boolean;
  analysisSummary?: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface VoiceTranscriptStats {
  totalSessions: number;
  totalMessages: number;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  analyzedCount: number;
  unanalyzedCount: number;
  sttDiffCount: number;
  dictionaryEntries: number;
}

export interface VoiceTranscriptAnalyzeResult {
  analyzed: number;
  newCorrections: Record<string, string[]>;
  summary: string;
  totalDictionaryEntries: number;
}

export const voiceTranscriptsApi = {
  list: (params?: { search?: string; sort?: string; order?: string; limit?: number }): Promise<VoiceTranscript[]> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.order) qs.set('order', params.order);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return fetchApi(`/api/file-stores/voice-transcripts/data${query ? `?${query}` : ''}`);
  },

  get: (id: string): Promise<VoiceTranscript> =>
    fetchApi(`/api/file-stores/voice-transcripts/data/${id}`),

  delete: (id: string): Promise<{ ok: boolean }> =>
    fetchApi(`/api/file-stores/voice-transcripts/data/${id}`, { method: 'DELETE' }),

  stats: (): Promise<VoiceTranscriptStats> =>
    fetchApi('/api/voice-transcripts/stats'),

  analyze: (): Promise<VoiceTranscriptAnalyzeResult> =>
    fetchApi('/api/voice-transcripts/analyze', { method: 'POST' }),

  analyzeAll: (): Promise<VoiceTranscriptAnalyzeResult> =>
    fetchApi('/api/voice-transcripts/analyze-all', { method: 'POST' }),
};
