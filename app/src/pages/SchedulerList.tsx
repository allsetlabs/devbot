import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { extractErrorMessage } from '../lib/format';
import { SchedulerItem } from '../components/SchedulerItem';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { SchedulerForm } from '../components/SchedulerForm';
import { SchedulerSettingsDrawer } from '../components/SchedulerSettingsDrawer';
import { ListPageHeader } from '../components/ListPageHeader';
import { useNav } from '../hooks/useNav';
import type { ScheduledTask, ClaudeModel } from '../types';

export function SchedulerList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { openNav } = useNav();
  const [settingsTask, setSettingsTask] = useState<ScheduledTask | null>(null);

  const {
    data: tasks = [],
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: () => api.listScheduledTasks(),
    refetchInterval: 5000,
  });

  const createMutation = useCrudMutation(
    ({
      prompt,
      intervalMinutes,
      maxRuns,
      workingDir,
      model,
      name,
    }: {
      prompt: string;
      intervalMinutes: number;
      maxRuns: number | null;
      workingDir: string;
      model: ClaudeModel;
      name?: string;
    }) => api.createScheduledTask({ prompt, intervalMinutes, maxRuns, workingDir, model, name }),
    [['scheduled-tasks']]
  );

  const deleteMutation = useCrudMutation(
    (id: string) => api.deleteScheduledTask(id),
    [['scheduled-tasks']]
  );

  const togglePauseMutation = useCrudMutation(
    (task: ScheduledTask) => {
      const newStatus = task.status === 'paused' ? 'active' : 'paused';
      return api.updateScheduledTask(task.id, { status: newStatus });
    },
    [['scheduled-tasks']]
  );

  const handleCreateTask = async (
    prompt: string,
    intervalMinutes: number,
    maxRuns: number | null,
    workingDir: string,
    model: ClaudeModel,
    name?: string
  ) => {
    await createMutation.mutateAsync({ prompt, intervalMinutes, maxRuns, workingDir, model, name });
  };

  const handleDeleteTask = (id: string) => deleteMutation.mutate(id);
  const handleTogglePause = (task: ScheduledTask) => togglePauseMutation.mutate(task);

  const handleViewHistory = (taskId: string) => {
    navigate(`/scheduler/${taskId}`);
  };

  const rerunMutation = useCrudMutation(
    (id: string) => api.rerunScheduledTask(id),
    [['scheduled-tasks']]
  );

  const handleRerun = (id: string) => rerunMutation.mutate(id);

  const handleSaveSettings = async (
    taskId: string,
    data: { prompt?: string; intervalMinutes?: number; maxRuns?: number | null; name?: string; model?: ClaudeModel; workingDir?: string | null }
  ) => {
    await api.updateScheduledTask(taskId, data);
    void queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
  };

  const error = extractErrorMessage(
    fetchError,
    deleteMutation.error,
    togglePauseMutation.error,
    rerunMutation.error
  );

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <ListPageHeader
        icon={<Clock className="h-6 w-6 text-primary" />}
        title="Scheduler"
        onMenuClick={openNav}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      >
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Task
        </Button>
      </ListPageHeader>

      {/* Error Banner */}
      <ErrorBanner error={error} />

      {/* Task List */}
      <main className="flex-1 overflow-y-auto">
        {isLoading && tasks.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-16 w-16 text-muted-foreground/50" />}
            title="No scheduled tasks"
            description="Create a task to run Claude Code on a schedule"
            actionLabel="Create First Task"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <SchedulerItem
                key={task.id}
                task={task}
                onDelete={() => handleDeleteTask(task.id)}
                onTogglePause={() => handleTogglePause(task)}
                onViewHistory={() => handleViewHistory(task.id)}
                onSettings={() => setSettingsTask(task)}
                onRerun={() => handleRerun(task.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Form Modal */}
      <SchedulerForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateTask}
      />

      {/* Settings Drawer */}
      <SchedulerSettingsDrawer
        task={settingsTask}
        open={settingsTask !== null}
        onClose={() => setSettingsTask(null)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
