/**
 * Cross-Session Memory API client
 *
 * Manages session memories and task dependency graphs for cross-session context sharing.
 */

import { BACKEND_URL, authHeaders } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionMemory {
  id: string;
  task_id: string;
  task_name: string | null;
  run_id: string;
  run_index: number;
  summary: string;
  key_findings: string[];
  output_data: Record<string, unknown> | null;
  tags: string[];
  run_status: 'completed' | 'failed';
  duration_seconds: number;
  model: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on: string[];
  tag_filters: Record<string, string[]>;
  memory_depth: Record<string, number>;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface DependencyGraphNode {
  task_id: string;
  task_name: string | null;
  status: string;
  depends_on: string[];
  depended_by: string[];
  memory_count: number;
  latest_memory_at: string | null;
}

export interface MemoryStats {
  total_memories: number;
  tasks_with_memory: number;
  total_dependencies: number;
  dependency_links: number;
  memories_by_status: Record<string, number>;
  memories_by_model: Record<string, number>;
  oldest_memory: string | null;
  newest_memory: string | null;
  avg_memories_per_task: number;
}

export interface ContextPreview {
  task_id: string;
  context: string;
  has_context: boolean;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const sessionMemoryApi = {
  // Memories
  listMemories: (options?: {
    task_id?: string;
    tags?: string[];
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ items: SessionMemory[]; total: number }> => {
    const params = new URLSearchParams();
    if (options?.task_id) params.set('task_id', options.task_id);
    if (options?.tags?.length) params.set('tags', options.tags.join(','));
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.search) params.set('search', options.search);
    const qs = params.toString();
    return fetchApi(`/api/session-memory${qs ? `?${qs}` : ''}`);
  },

  getMemory: (id: string): Promise<SessionMemory> =>
    fetchApi(`/api/session-memory/${id}`),

  getTaskMemories: (
    taskId: string,
    limit?: number
  ): Promise<{ items: SessionMemory[]; total: number }> => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return fetchApi(`/api/session-memory/task/${taskId}${qs ? `?${qs}` : ''}`);
  },

  getLatestTaskMemory: (taskId: string): Promise<SessionMemory> =>
    fetchApi(`/api/session-memory/task/${taskId}/latest`),

  createMemory: (
    data: Partial<SessionMemory> & { task_id: string; summary: string }
  ): Promise<SessionMemory> =>
    fetchApi('/api/session-memory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMemory: (
    id: string,
    data: Partial<SessionMemory>
  ): Promise<SessionMemory> =>
    fetchApi(`/api/session-memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMemory: (id: string): Promise<{ deleted: boolean }> =>
    fetchApi(`/api/session-memory/${id}`, { method: 'DELETE' }),

  // Statistics
  getStats: (): Promise<MemoryStats> =>
    fetchApi('/api/session-memory/stats'),

  // Dependencies
  listDependencies: (): Promise<{ items: TaskDependency[]; total: number }> =>
    fetchApi('/api/session-memory/dependencies'),

  getTaskDependencies: (taskId: string): Promise<TaskDependency> =>
    fetchApi(`/api/session-memory/dependencies/${taskId}`),

  setTaskDependencies: (
    taskId: string,
    dependsOn: string[],
    options?: {
      tag_filters?: Record<string, string[]>;
      memory_depth?: Record<string, number>;
    }
  ): Promise<TaskDependency> =>
    fetchApi(`/api/session-memory/dependencies/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        depends_on: dependsOn,
        tag_filters: options?.tag_filters,
        memory_depth: options?.memory_depth,
      }),
    }),

  removeDependencies: (taskId: string): Promise<{ removed: boolean }> =>
    fetchApi(`/api/session-memory/dependencies/${taskId}`, {
      method: 'DELETE',
    }),

  // Graph
  getGraph: (): Promise<{ nodes: DependencyGraphNode[] }> =>
    fetchApi('/api/session-memory/graph'),

  // Context preview
  getContextPreview: (taskId: string): Promise<ContextPreview> =>
    fetchApi(`/api/session-memory/task/${taskId}/context`),
};
