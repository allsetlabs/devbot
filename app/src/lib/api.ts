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
  MemoriesResponse,
  MessageSearchResult,
  QueuedMessage,
  OcrDocument,
  OcrUploadResponse,
} from '../types';

import { VITE_BACKEND_PORT as BACKEND_PORT, VITE_API_KEY as API_KEY } from './env';

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
        headers: { 'X-API-Key': API_KEY },
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
    return `${BACKEND_URL}/api/remotion-videos/${id}/stream?key=${encodeURIComponent(API_KEY)}`;
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

  // Memories endpoints
  listMemories: (): Promise<MemoriesResponse> => {
    return fetchApi('/api/memories');
  },

  updateMemory: (
    project: string,
    filename: string,
    content: string
  ): Promise<{ success: boolean }> => {
    return fetchApi(
      `/api/memories/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }
    );
  },

  deleteMemory: (project: string, filename: string): Promise<{ success: boolean }> => {
    return fetchApi(
      `/api/memories/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`,
      {
        method: 'DELETE',
      }
    );
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

};

export function getXtermWsUrl(port: number): string {
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
    headers: {
      'X-API-Key': API_KEY,
    },
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
    headers: { 'X-API-Key': API_KEY },
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
    headers: { 'X-API-Key': API_KEY },
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
