/**
 * Cross-Session Memory — structured context sharing between scheduler runs
 *
 * Each scheduler run can save a "memory" (summary, key findings, output data)
 * that subsequent runs of the same or dependent tasks can read. Tasks declare
 * dependencies on other tasks so the scheduler-worker can build rich context
 * blocks before each execution.
 *
 * Uses FileStore for persistence:
 *   - session-memories.json: individual memory entries per run
 *   - task-dependencies.json: dependency edges between tasks
 */

import { eq } from 'drizzle-orm';
import { coreDb, scheduled_tasks } from './db/core.js';
import type { ScheduledTaskRow } from './db/types.js';
import { FileStore, type FileStoreRecord } from './file-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionMemory extends FileStoreRecord {
  /** The scheduler task that produced this memory */
  task_id: string;
  /** Human-readable task name at the time of writing */
  task_name: string | null;
  /** Run ID that produced this memory */
  run_id: string;
  /** Run index (1-based) */
  run_index: number;
  /** One-line summary of what was accomplished */
  summary: string;
  /** Structured key findings / outputs */
  key_findings: string[];
  /** Arbitrary structured output data the next session can consume */
  output_data: Record<string, unknown> | null;
  /** Searchable tags */
  tags: string[];
  /** Status of the run that produced this */
  run_status: 'completed' | 'failed';
  /** Duration of the run in seconds */
  duration_seconds: number;
  /** Model used */
  model: string;
}

export interface TaskDependencyRecord extends FileStoreRecord {
  /** The task that has the dependencies */
  task_id: string;
  /** Task IDs this task depends on */
  depends_on: string[];
  /** Per-dependency tag filters: { taskId: ['tag1', 'tag2'] } */
  tag_filters: Record<string, string[]>;
  /** Per-dependency memory depth: { taskId: 3 } — how many memories to pull */
  memory_depth: Record<string, number>;
}

export interface DependencyGraphNode {
  task_id: string;
  task_name: string | null;
  status: string;
  memory_count: number;
  latest_memory_at: string | null;
  depends_on: string[];
  depended_by: string[];
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const DATA_DIR = '/tmp/devbot/data';

export const sessionMemoryStore = new FileStore<SessionMemory>({
  filePath: `${DATA_DIR}/session-memories.json`,
  name: 'session-memories',
  autoCommit: false,
  idLength: 10,
});

export const taskDependencyStore = new FileStore<TaskDependencyRecord>({
  filePath: `${DATA_DIR}/task-dependencies.json`,
  name: 'task-dependencies',
  autoCommit: false,
  idLength: 8,
});

// ---------------------------------------------------------------------------
// Memory CRUD
// ---------------------------------------------------------------------------

/**
 * List all memories with optional filters.
 */
export async function listMemories(opts?: {
  task_id?: string;
  tags?: string[];
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ items: SessionMemory[]; total: number }> {
  const filter: Partial<SessionMemory> = {};
  if (opts?.task_id) filter.task_id = opts.task_id;
  if (opts?.status) filter.run_status = opts.status as 'completed' | 'failed';

  const items_raw = await sessionMemoryStore.list({
    filter,
    search: opts?.search,
    sort: 'created_at' as keyof SessionMemory,
    order: 'desc',
    limit: opts?.limit,
    offset: opts?.offset,
  });

  let items = items_raw;

  // Filter by tags if specified (FileStore filter only does exact match)
  if (opts?.tags && opts.tags.length > 0) {
    items = items.filter((m) =>
      opts.tags!.some((tag) => m.tags.includes(tag))
    );
  }

  return { items, total: items.length };
}

/**
 * Get a single memory by ID.
 */
export async function getMemory(id: string): Promise<SessionMemory | null> {
  return (await sessionMemoryStore.get(id)) ?? null;
}

/**
 * Get all memories for a specific task, ordered newest first.
 */
export async function getTaskMemories(
  taskId: string,
  limit?: number
): Promise<SessionMemory[]> {
  const items = await sessionMemoryStore.list({
    filter: { task_id: taskId } as Partial<SessionMemory>,
    sort: 'created_at' as keyof SessionMemory,
    order: 'desc',
    limit,
  });
  return items;
}

/**
 * Get the latest memory for a task.
 */
export async function getLatestTaskMemory(taskId: string): Promise<SessionMemory | null> {
  const memories = await getTaskMemories(taskId, 1);
  return memories[0] || null;
}

/**
 * Save a session memory after a scheduler run completes.
 */
export async function saveSessionMemory(opts: {
  task_id: string;
  task_name: string | null;
  run_id: string;
  run_index: number;
  summary: string;
  key_findings?: string[];
  output_data?: Record<string, unknown> | null;
  tags?: string[];
  run_status: 'completed' | 'failed';
  duration_seconds: number;
  model: string;
}): Promise<SessionMemory> {
  const memory = await sessionMemoryStore.create({
    task_id: opts.task_id,
    task_name: opts.task_name,
    run_id: opts.run_id,
    run_index: opts.run_index,
    summary: opts.summary,
    key_findings: opts.key_findings ?? [],
    output_data: opts.output_data ?? null,
    tags: opts.tags ?? [],
    run_status: opts.run_status,
    duration_seconds: opts.duration_seconds,
    model: opts.model,
    created_by: 'system',
    updated_by: 'system',
    settings: {},
  });

  // Prune old memories — keep last 20 per task
  await pruneTaskMemories(opts.task_id, 20);

  console.log(
    `[SessionMemory] Saved memory for task ${opts.task_id} run #${opts.run_index}: ${opts.summary.slice(0, 80)}`
  );

  return memory;
}

/**
 * Update a memory.
 */
export async function updateMemory(
  id: string,
  data: Partial<SessionMemory>
): Promise<SessionMemory | null> {
  try {
    return (await sessionMemoryStore.update(id, { ...data, updated_by: 'user' })) ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete a memory.
 */
export async function deleteMemory(id: string): Promise<boolean> {
  return sessionMemoryStore.delete(id);
}

/**
 * Prune memories for a task, keeping only the most recent N.
 */
async function pruneTaskMemories(taskId: string, keep: number): Promise<void> {
  const all = await getTaskMemories(taskId);
  if (all.length <= keep) return;

  const toDelete = all.slice(keep);
  for (const mem of toDelete) {
    await sessionMemoryStore.delete(mem.id);
  }
  if (toDelete.length > 0) {
    console.log(`[SessionMemory] Pruned ${toDelete.length} old memories for task ${taskId}`);
  }
}

// ---------------------------------------------------------------------------
// Dependency management
// ---------------------------------------------------------------------------

/**
 * Get dependencies for a specific task.
 */
export async function getTaskDependencies(
  taskId: string
): Promise<TaskDependencyRecord | null> {
  const items = await taskDependencyStore.list({
    filter: { task_id: taskId } as Partial<TaskDependencyRecord>,
  });
  return items[0] ?? null;
}

/**
 * Set dependencies for a task. Replaces any existing config.
 */
export async function setTaskDependencies(
  taskId: string,
  dependsOn: string[],
  options?: {
    tag_filters?: Record<string, string[]>;
    memory_depth?: Record<string, number>;
  }
): Promise<TaskDependencyRecord> {
  // Check for circular dependencies
  for (const depId of dependsOn) {
    if (depId === taskId) {
      throw new Error('Circular dependency: a task cannot depend on itself');
    }
    // Check if the dependency already depends on us (direct cycle)
    const depConfig = await getTaskDependencies(depId);
    if (depConfig?.depends_on.includes(taskId)) {
      throw new Error(
        `Circular dependency detected: ${depId} already depends on ${taskId}`
      );
    }
  }

  const existing = await getTaskDependencies(taskId);

  if (existing) {
    const updated = await taskDependencyStore.update(existing.id, {
      depends_on: dependsOn,
      tag_filters: options?.tag_filters ?? existing.tag_filters,
      memory_depth: options?.memory_depth ?? existing.memory_depth,
      updated_by: 'user',
      settings: existing.settings ?? {},
    });
    return updated as TaskDependencyRecord;
  }

  return taskDependencyStore.create({
    task_id: taskId,
    depends_on: dependsOn,
    tag_filters: options?.tag_filters ?? {},
    memory_depth: options?.memory_depth ?? {},
    created_by: 'user',
    updated_by: 'user',
    settings: {},
  });
}

/**
 * Remove all dependencies for a task.
 */
export async function removeTaskDependencies(taskId: string): Promise<boolean> {
  const existing = await getTaskDependencies(taskId);
  if (!existing) return false;
  return taskDependencyStore.delete(existing.id);
}

/**
 * List all task dependency records.
 */
export async function listAllDependencies(): Promise<TaskDependencyRecord[]> {
  return taskDependencyStore.list({});
}

// ---------------------------------------------------------------------------
// Dependency graph
// ---------------------------------------------------------------------------

/**
 * Build a full dependency graph of all tasks with memory or dependencies.
 */
export async function getDependencyGraph(): Promise<DependencyGraphNode[]> {
  let tasks: ScheduledTaskRow[] = [];
  try {
    tasks = coreDb.select().from(scheduled_tasks).all();
  } catch {
    return [];
  }

  const allDeps = await listAllDependencies();
  const memories = await sessionMemoryStore.list({});

  // Build maps
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const depMap = new Map<string, string[]>();
  for (const dep of allDeps) {
    depMap.set(dep.task_id, dep.depends_on);
  }

  // Memory counts & latest per task
  const memoryCountMap = new Map<string, number>();
  const latestMemoryMap = new Map<string, string>();
  for (const mem of memories) {
    memoryCountMap.set(mem.task_id, (memoryCountMap.get(mem.task_id) ?? 0) + 1);
    const current = latestMemoryMap.get(mem.task_id);
    if (!current || mem.created_at > current) {
      latestMemoryMap.set(mem.task_id, mem.created_at);
    }
  }

  // Reverse dependency map
  const dependedByMap = new Map<string, string[]>();
  for (const [taskId, deps] of depMap) {
    for (const depId of deps) {
      const existing = dependedByMap.get(depId) ?? [];
      existing.push(taskId);
      dependedByMap.set(depId, existing);
    }
  }

  // Relevant task IDs = those with memories or deps
  const relevantIds = new Set<string>();
  for (const mem of memories) relevantIds.add(mem.task_id);
  for (const [taskId, deps] of depMap) {
    relevantIds.add(taskId);
    for (const d of deps) relevantIds.add(d);
  }

  return Array.from(relevantIds).map((taskId) => ({
    task_id: taskId,
    task_name: taskMap.get(taskId)?.name ?? null,
    status: taskMap.get(taskId)?.status ?? 'unknown',
    memory_count: memoryCountMap.get(taskId) ?? 0,
    latest_memory_at: latestMemoryMap.get(taskId) ?? null,
    depends_on: depMap.get(taskId) ?? [],
    depended_by: dependedByMap.get(taskId) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Context builder — called by scheduler-worker before each run
// ---------------------------------------------------------------------------

/** Max chars of memory context to inject into a prompt */
const MAX_CONTEXT_CHARS = 12_000;

/**
 * Build cross-session context for a task, formatted as a string block
 * ready for prompt injection. Returns null if no context available.
 */
export async function buildCrossSessionContext(taskId: string): Promise<string | null> {
  // 1. Own previous memories (last 5)
  const ownMemories = await getTaskMemories(taskId, 5);

  // 2. Dependency memories
  const depConfig = await getTaskDependencies(taskId);
  const depMemories: Array<{
    task_id: string;
    task_name: string | null;
    memories: SessionMemory[];
  }> = [];

  if (depConfig) {
    for (const depTaskId of depConfig.depends_on) {
      const depth = depConfig.memory_depth[depTaskId] ?? 3;
      let memories = await getTaskMemories(depTaskId, depth);

      // Apply tag filters if configured
      const tagFilter = depConfig.tag_filters[depTaskId];
      if (tagFilter && tagFilter.length > 0) {
        memories = memories.filter((m) =>
          tagFilter.some((tag) => m.tags.includes(tag))
        );
      }

      if (memories.length > 0) {
        // Look up task name
        let taskName: string | null = null;
        try {
          const task = coreDb
            .select({ name: scheduled_tasks.name })
            .from(scheduled_tasks)
            .where(eq(scheduled_tasks.id, depTaskId))
            .get();
          taskName = task?.name ?? null;
        } catch {
          /* ignore */
        }

        depMemories.push({
          task_id: depTaskId,
          task_name: taskName ?? memories[0]?.task_name ?? null,
          memories,
        });
      }
    }
  }

  if (ownMemories.length === 0 && depMemories.length === 0) {
    return null;
  }

  // 3. Format into a prompt block
  return formatContextBlock(ownMemories, depMemories);
}

/**
 * Format memories into a prompt-ready context block.
 */
function formatContextBlock(
  ownMemories: SessionMemory[],
  depMemories: Array<{
    task_id: string;
    task_name: string | null;
    memories: SessionMemory[];
  }>
): string {
  const sections: string[] = ['## Cross-Session Memory\n'];
  let totalChars = 0;

  // Own history
  if (ownMemories.length > 0) {
    sections.push('### Previous Runs of This Task\n');
    for (const mem of ownMemories) {
      const entry = formatMemoryEntry(mem);
      if (totalChars + entry.length > MAX_CONTEXT_CHARS) break;
      sections.push(entry);
      totalChars += entry.length;
    }
  }

  // Dependency outputs
  if (depMemories.length > 0) {
    sections.push('### Context from Upstream Tasks\n');
    for (const dep of depMemories) {
      const name = dep.task_name ?? dep.task_id;
      sections.push(`#### ${name}\n`);
      for (const mem of dep.memories) {
        const entry = formatMemoryEntry(mem);
        if (totalChars + entry.length > MAX_CONTEXT_CHARS) break;
        sections.push(entry);
        totalChars += entry.length;
      }
    }
  }

  return sections.join('\n');
}

/**
 * Format a single memory entry for prompt injection.
 */
function formatMemoryEntry(mem: SessionMemory): string {
  const date = new Date(mem.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [`**Run #${mem.run_index}** (${date}) — ${mem.run_status}`];
  lines.push(`Summary: ${mem.summary}`);

  if (mem.key_findings.length > 0) {
    lines.push('Key findings:');
    for (const f of mem.key_findings) {
      lines.push(`  - ${f}`);
    }
  }

  if (mem.output_data && Object.keys(mem.output_data).length > 0) {
    const dataStr = JSON.stringify(mem.output_data, null, 2);
    if (dataStr.length < 2000) {
      lines.push(`Output data:\n\`\`\`json\n${dataStr}\n\`\`\``);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Auto-extract memory from Claude output
// ---------------------------------------------------------------------------

/**
 * Extract a memory summary from Claude's output text.
 * Looks for structured markers or falls back to heuristic extraction.
 */
export function extractMemoryFromOutput(
  output: string,
  maxSummaryLen = 200
): {
  summary: string;
  key_findings: string[];
  output_data: Record<string, unknown>;
  tags: string[];
} {
  const key_findings: string[] = [];
  const output_data: Record<string, unknown> = {};
  const tags: string[] = [];

  // Try to find a structured SESSION_MEMORY block
  const memoryBlockMatch = output.match(
    /<!-- SESSION_MEMORY -->\s*([\s\S]*?)\s*<!-- \/SESSION_MEMORY -->/
  );
  if (memoryBlockMatch) {
    try {
      const parsed = JSON.parse(memoryBlockMatch[1]);
      return {
        summary: parsed.summary || 'Task completed',
        key_findings: parsed.key_findings ?? [],
        output_data: parsed.output_data ?? {},
        tags: parsed.tags ?? [],
      };
    } catch {
      // Not valid JSON — use the text as summary
      return {
        summary: memoryBlockMatch[1].trim().slice(0, maxSummaryLen),
        key_findings: [],
        output_data: {},
        tags: [],
      };
    }
  }

  // Extract git commit messages as key findings
  const commitMatches = output.matchAll(
    /(?:feat|fix|docs|chore|refactor)\([^)]*\):\s*(.+)/g
  );
  for (const match of commitMatches) {
    key_findings.push(match[1].trim());
  }

  // Try to extract JSON blocks as output data
  const jsonMatch = output.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.assign(output_data, parsed);
      }
    } catch {
      /* ignore */
    }
  }

  // Build summary from first meaningful lines
  const summaryLines: string[] = [];
  const lines = output.split('\n').filter((l) => l.trim().length > 0);
  let collecting = false;
  for (const line of lines) {
    if (line.startsWith('```') || line.startsWith('{')) {
      collecting = false;
      continue;
    }
    if (!collecting && line.length > 20 && !line.startsWith('#')) {
      collecting = true;
    }
    if (collecting) {
      summaryLines.push(line.trim());
      if (summaryLines.join(' ').length >= maxSummaryLen) break;
    }
  }

  return {
    summary: summaryLines.join(' ').slice(0, maxSummaryLen) || 'Task completed',
    key_findings,
    output_data,
    tags,
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getMemoryStats(): Promise<{
  total_memories: number;
  tasks_with_memory: number;
  total_dependencies: number;
  dependency_links: number;
  memories_by_status: Record<string, number>;
  memories_by_model: Record<string, number>;
  oldest_memory: string | null;
  newest_memory: string | null;
  avg_memories_per_task: number;
}> {
  const memories = await sessionMemoryStore.list({});
  const allDeps = await listAllDependencies();

  const taskIds = new Set(memories.map((m) => m.task_id));
  const depLinks = allDeps.reduce((sum, d) => sum + d.depends_on.length, 0);

  // Status & model breakdowns
  const byStatus: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  for (const mem of memories) {
    byStatus[mem.run_status] = (byStatus[mem.run_status] ?? 0) + 1;
    byModel[mem.model] = (byModel[mem.model] ?? 0) + 1;
  }

  // Oldest/newest
  const sorted = [...memories].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return {
    total_memories: memories.length,
    tasks_with_memory: taskIds.size,
    total_dependencies: allDeps.length,
    dependency_links: depLinks,
    memories_by_status: byStatus,
    memories_by_model: byModel,
    oldest_memory: sorted[0]?.created_at ?? null,
    newest_memory: sorted[sorted.length - 1]?.created_at ?? null,
    avg_memories_per_task:
      taskIds.size > 0
        ? Math.round((memories.length / taskIds.size) * 10) / 10
        : 0,
  };
}
