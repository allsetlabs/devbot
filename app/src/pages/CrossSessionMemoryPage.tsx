import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { toast } from 'sonner';
import { HeaderSlot } from '../components/HeaderSlot';
import {
  sessionMemoryApi,
  type SessionMemory,
  type DependencyGraphNode,
  type MemoryStats,
  type TaskDependency,
} from '../lib/sessionMemoryApi';
import { api } from '../lib/api';
import {
  RefreshCw,
  Brain,
  Database,
  GitBranch,
  Network,
  Search,
  Trash2,
  ChevronDown,
  ChevronRight,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Plus,
  X,
  Eye,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

type TabId = 'memories' | 'dependencies' | 'graph';

interface SchedulerTask {
  id: string;
  name: string | null;
  status: string;
}

// ─── Page ───────────────────────────────────────────────────────────────

export function CrossSessionMemoryPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<SessionMemory[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [graphNodes, setGraphNodes] = useState<DependencyGraphNode[]>([]);
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('memories');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, memoriesData, depsData, graphData, tasksData] =
        await Promise.all([
          sessionMemoryApi.getStats(),
          sessionMemoryApi.listMemories({ limit: 100, search: search || undefined }),
          sessionMemoryApi.listDependencies(),
          sessionMemoryApi.getGraph(),
          api.listScheduledTasks() as Promise<SchedulerTask[]>,
        ]);
      setStats(statsData);
      setMemories(memoriesData.items);
      setDependencies(depsData.items);
      setGraphNodes(graphData.nodes);
      setTasks(tasksData);
    } catch (err) {
      toast.error('Failed to load session memory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDeleteMemory = async (id: string) => {
    try {
      await sessionMemoryApi.deleteMemory(id);
      toast.success('Memory deleted');
      refresh();
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof Brain }[] = [
    { id: 'memories', label: 'Memories', icon: Brain },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
    { id: 'graph', label: 'Graph', icon: Network },
  ];

  return (
    <div className="space-y-4 pb-20">
      <HeaderSlot>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Brain className="h-4 w-4 text-purple-500" />}
            label="Total Memories"
            value={String(stats.total_memories)}
          />
          <StatCard
            icon={<Database className="h-4 w-4 text-blue-500" />}
            label="Tasks with Memory"
            value={String(stats.tasks_with_memory)}
          />
          <StatCard
            icon={<GitBranch className="h-4 w-4 text-emerald-500" />}
            label="Dependencies"
            value={String(stats.dependency_links)}
          />
          <StatCard
            icon={<Clock className="h-4 w-4 text-amber-500" />}
            label="Avg per Task"
            value={String(stats.avg_memories_per_task)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {activeTab === 'memories' && (
            <MemoriesTab
              memories={memories}
              onDelete={handleDeleteMemory}
            />
          )}
          {activeTab === 'dependencies' && (
            <DependenciesTab
              dependencies={dependencies}
              tasks={tasks}
              onRefresh={refresh}
            />
          )}
          {activeTab === 'graph' && <GraphTab nodes={graphNodes} />}
        </>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3">
        {icon}
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Memories Tab ───────────────────────────────────────────────────────

function MemoriesTab({
  memories,
  onDelete,
}: {
  memories: SessionMemory[];
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (memories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No memories yet. Run scheduler tasks to start building cross-session context.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {memories.map((mem) => {
        const isExpanded = expandedId === mem.id;
        const dateStr = new Date(mem.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <Card key={mem.id}>
            <CardContent className="p-3">
              {/* Header */}
              <div
                className="flex cursor-pointer items-start gap-2"
                onClick={() => setExpandedId(isExpanded ? null : mem.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {mem.run_status === 'completed' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {mem.task_name ?? mem.task_id}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      #{mem.run_index}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {mem.summary}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{dateStr}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {mem.model}
                    </span>
                    {mem.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(mem.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Summary</p>
                    <p className="mt-0.5 text-sm">{mem.summary}</p>
                  </div>

                  {mem.key_findings.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Key Findings
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {mem.key_findings.map((f, i) => (
                          <li key={i} className="text-sm text-muted-foreground">
                            • {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mem.output_data && Object.keys(mem.output_data).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Output Data
                      </p>
                      <pre className="mt-0.5 overflow-x-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(mem.output_data, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Duration: {formatDuration(mem.duration_seconds)}</span>
                    <span>Run ID: {mem.run_id}</span>
                    <span>Task ID: {mem.task_id}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Dependencies Tab ───────────────────────────────────────────────────

function DependenciesTab({
  dependencies,
  tasks,
  onRefresh,
}: {
  dependencies: TaskDependency[];
  tasks: SchedulerTask[];
  onRefresh: () => void;
}) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);
  const [contextPreview, setContextPreview] = useState<string | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);

  const depMap = new Map(dependencies.map((d) => [d.task_id, d]));

  const handleStartEdit = (taskId: string) => {
    const existing = depMap.get(taskId);
    setSelectedDeps(existing?.depends_on ?? []);
    setEditingTaskId(taskId);
  };

  const handleSave = async () => {
    if (!editingTaskId) return;
    try {
      await sessionMemoryApi.setTaskDependencies(editingTaskId, selectedDeps);
      toast.success('Dependencies saved');
      setEditingTaskId(null);
      onRefresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save dependencies'
      );
    }
  };

  const handleRemove = async (taskId: string) => {
    try {
      await sessionMemoryApi.removeDependencies(taskId);
      toast.success('Dependencies removed');
      onRefresh();
    } catch {
      toast.error('Failed to remove dependencies');
    }
  };

  const handlePreviewContext = async (taskId: string) => {
    try {
      if (previewTaskId === taskId) {
        setPreviewTaskId(null);
        setContextPreview(null);
        return;
      }
      const preview = await sessionMemoryApi.getContextPreview(taskId);
      setContextPreview(preview.context || 'No context available yet.');
      setPreviewTaskId(taskId);
    } catch {
      toast.error('Failed to load context preview');
    }
  };

  const taskName = (id: string) =>
    tasks.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="space-y-3">
      {/* Active tasks with dependency edit */}
      {tasks
        .filter((t) => t.status === 'active' || depMap.has(t.id))
        .map((task) => {
          const dep = depMap.get(task.id);
          const isEditing = editingTaskId === task.id;

          return (
            <Card key={task.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {task.name ?? task.id}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {task.status}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handlePreviewContext(task.id)}
                    >
                      <Eye className="h-3 w-3" />
                      {previewTaskId === task.id ? 'Hide' : 'Preview'}
                    </Button>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleStartEdit(task.id)}
                      >
                        <Plus className="h-3 w-3" />
                        Edit
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSave}
                      >
                        Save
                      </Button>
                    )}
                    {dep && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-500"
                        onClick={() => handleRemove(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Current dependencies display */}
                {dep && !isEditing && dep.depends_on.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground">Depends on:</span>
                    {dep.depends_on.map((depId) => (
                      <span
                        key={depId}
                        className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
                      >
                        <ArrowRight className="h-2.5 w-2.5" />
                        {taskName(depId)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Editing mode */}
                {isEditing && (
                  <div className="space-y-2 border-t pt-2">
                    <p className="text-xs text-muted-foreground">
                      Select tasks this depends on:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tasks
                        .filter((t) => t.id !== task.id)
                        .map((t) => {
                          const isSelected = selectedDeps.includes(t.id);
                          return (
                            <Button
                              key={t.id}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => {
                                setSelectedDeps((prev) =>
                                  isSelected
                                    ? prev.filter((d) => d !== t.id)
                                    : [...prev, t.id]
                                );
                              }}
                            >
                              {isSelected && <CheckCircle2 className="h-3 w-3" />}
                              {t.name ?? t.id}
                            </Button>
                          );
                        })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingTaskId(null)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Context preview */}
                {previewTaskId === task.id && contextPreview !== null && (
                  <div className="border-t pt-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Context Preview
                    </p>
                    <pre className="max-h-60 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap">
                      {contextPreview}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

      {tasks.filter((t) => t.status === 'active' || depMap.has(t.id)).length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No active scheduler tasks. Create tasks in the Scheduler to set up dependencies.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Graph Tab ──────────────────────────────────────────────────────────

function GraphTab({ nodes }: { nodes: DependencyGraphNode[] }) {
  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No dependency graph yet. Add dependencies between tasks to see the graph.
        </CardContent>
      </Card>
    );
  }

  // Separate into root nodes (no depends_on) and dependent nodes
  const roots = nodes.filter((n) => n.depends_on.length === 0);
  const dependents = nodes.filter((n) => n.depends_on.length > 0);

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Active
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Paused
        </span>
        <span className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          Unknown
        </span>
      </div>

      {/* Root nodes (upstream tasks with no dependencies) */}
      {roots.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Root Tasks (No Dependencies)
          </p>
          <div className="space-y-2">
            {roots.map((node) => (
              <GraphNodeCard key={node.task_id} node={node} allNodes={nodes} />
            ))}
          </div>
        </div>
      )}

      {/* Dependent nodes */}
      {dependents.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Dependent Tasks
          </p>
          <div className="space-y-2">
            {dependents.map((node) => (
              <GraphNodeCard key={node.task_id} node={node} allNodes={nodes} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GraphNodeCard({
  node,
  allNodes,
}: {
  node: DependencyGraphNode;
  allNodes: DependencyGraphNode[];
}) {
  const statusColor =
    node.status === 'active'
      ? 'bg-emerald-500'
      : node.status === 'paused'
        ? 'bg-amber-500'
        : 'bg-muted-foreground';

  const nodeName = (id: string) =>
    allNodes.find((n) => n.task_id === id)?.task_name ?? id;

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
          <span className="truncate text-sm font-medium">
            {node.task_name ?? node.task_id}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {node.memory_count} {node.memory_count === 1 ? 'memory' : 'memories'}
          </span>
        </div>

        {node.depends_on.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground">← Reads from:</span>
            {node.depends_on.map((depId) => (
              <span
                key={depId}
                className="rounded bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-600 dark:text-blue-400"
              >
                {nodeName(depId)}
              </span>
            ))}
          </div>
        )}

        {node.depended_by.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground">→ Feeds into:</span>
            {node.depended_by.map((depId) => (
              <span
                key={depId}
                className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"
              >
                {nodeName(depId)}
              </span>
            ))}
          </div>
        )}

        {node.latest_memory_at && (
          <p className="text-xs text-muted-foreground">
            Last memory:{' '}
            {new Date(node.latest_memory_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
