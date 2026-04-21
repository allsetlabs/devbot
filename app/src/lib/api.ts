import type {
  Session,
  CreateSessionResponse,
  HealthResponse,
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
  McpServerConfig,
  McpServersResponse,
  HooksResponse,
  MemoriesResponse,
  GitStatus,
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

  listInteractiveChats: (type?: string): Promise<InteractiveChat[]> => {
    const params = type ? `?type=${encodeURIComponent(type)}` : '';
    return fetchApi(`/api/interactive-chats${params}`);
  },

  getInteractiveChat: (id: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}`);
  },

  createInteractiveChat: (options?: {
    name?: string;
    systemPrompt?: string;
    permissionMode?: PermissionMode;
    model?: ClaudeModel;
    maxTurns?: number | null;
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

  sendChatMessage: (chatId: string, prompt: string, branch?: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/send`, {
      method: 'POST',
      body: JSON.stringify({ prompt, branch }),
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

  getChatMessages: (chatId: string, afterSequence = 0, branch = 'main'): Promise<ChatMessage[]> => {
    const params = new URLSearchParams();
    if (afterSequence > 0) params.set('afterSequence', String(afterSequence));
    if (branch !== 'main') params.set('branch', branch);
    const qs = params.toString();
    return fetchApi(`/api/interactive-chats/${chatId}/messages${qs ? `?${qs}` : ''}`);
  },

  getChatBranches: (chatId: string): Promise<string[]> => {
    return fetchApi(`/api/interactive-chats/${chatId}/branches`);
  },

  createChatBranch: (chatId: string, fromSequence: number, branchName?: string, sourceBranch = 'main'): Promise<{ branchId: string; messagesCopied: number }> => {
    return fetchApi(`/api/interactive-chats/${chatId}/branch`, {
      method: 'POST',
      body: JSON.stringify({ fromSequence, branchName, sourceBranch }),
    });
  },

  renameInteractiveChat: (id: string, name: string): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/rename`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
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

  changeChatMaxTurns: (id: string, maxTurns: number | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/max-turns`, {
      method: 'POST',
      body: JSON.stringify({ maxTurns }),
    });
  },

  changeChatEffort: (id: string, effort: string | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/effort`, {
      method: 'POST',
      body: JSON.stringify({ effort }),
    });
  },

  changeChatAllowedTools: (id: string, allowedTools: string[] | null): Promise<InteractiveChat> => {
    return fetchApi(`/api/interactive-chats/${id}/allowed-tools`, {
      method: 'POST',
      body: JSON.stringify({ allowedTools }),
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

  getGitStatus: (dir: string): Promise<GitStatus> => {
    return fetchApi(`/api/git-status?dir=${encodeURIComponent(dir)}`);
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

  addCompanyFeedback: (companyId: string, type: 'user' | 'investor', prompt: string): Promise<FeedbackDocument> => {
    return fetchApi(`/api/companies/${companyId}/feedback/${type}`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // MCP servers endpoints
  listMcpServers: (): Promise<McpServersResponse> => {
    return fetchApi('/api/mcp-servers');
  },

  addMcpServer: (
    name: string,
    command: string,
    args?: string[],
    env?: Record<string, string>,
    cwd?: string
  ): Promise<{ success: boolean; name: string; config: McpServerConfig }> => {
    return fetchApi('/api/mcp-servers', {
      method: 'POST',
      body: JSON.stringify({ name, command, args, env, cwd }),
    });
  },

  deleteMcpServer: (name: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/mcp-servers/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },

  // Hooks endpoints
  listHooks: (): Promise<HooksResponse> => {
    return fetchApi('/api/hooks');
  },

  addHook: (
    event: string,
    matcher: string,
    command: string
  ): Promise<{ success: boolean }> => {
    return fetchApi('/api/hooks', {
      method: 'POST',
      body: JSON.stringify({ event, matcher, command }),
    });
  },

  deleteHook: (event: string, index: number): Promise<{ success: boolean }> => {
    return fetchApi(`/api/hooks/${encodeURIComponent(event)}/${index}`, { method: 'DELETE' });
  },

  // Keybindings endpoints
  listKeybindings: (): Promise<{ keybindings: Array<{ key: string; command: string; when?: string }>; path: string }> => {
    return fetchApi('/api/keybindings');
  },

  addKeybinding: (key: string, command: string, when?: string): Promise<{ success: boolean }> => {
    return fetchApi('/api/keybindings', {
      method: 'POST',
      body: JSON.stringify({ key, command, when }),
    });
  },

  deleteKeybinding: (index: number): Promise<{ success: boolean }> => {
    return fetchApi(`/api/keybindings/${index}`, { method: 'DELETE' });
  },

  // Memories endpoints
  listMemories: (): Promise<MemoriesResponse> => {
    return fetchApi('/api/memories');
  },

  updateMemory: (project: string, filename: string, content: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/memories/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  deleteMemory: (project: string, filename: string): Promise<{ success: boolean }> => {
    return fetchApi(`/api/memories/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
  },

  // CLAUDE.md endpoints
  getClaudeMd: (dir: string): Promise<{ content: string | null; path: string; exists: boolean }> => {
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

  // Worktree endpoints
  listWorktrees: (dir: string): Promise<{
    isGitRepo: boolean;
    worktrees: Array<{
      path: string;
      branch: string;
      head: string;
      isBare: boolean;
      isMain: boolean;
    }>;
  }> => {
    return fetchApi(`/api/worktrees?dir=${encodeURIComponent(dir)}`);
  },

  createWorktree: (
    dir: string,
    path: string,
    branch: string,
    newBranch?: boolean
  ): Promise<{ success: boolean }> => {
    return fetchApi('/api/worktrees', {
      method: 'POST',
      body: JSON.stringify({ dir, path, branch, newBranch }),
    });
  },

  removeWorktree: (dir: string, path: string): Promise<{ success: boolean }> => {
    return fetchApi('/api/worktrees', {
      method: 'DELETE',
      body: JSON.stringify({ dir, path }),
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
