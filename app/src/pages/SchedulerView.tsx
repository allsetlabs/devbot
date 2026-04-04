import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { POLL_INTERVALS } from '../lib/constants';
import { RunSelector } from '../components/RunSelector';
import { SchedulerViewHeader } from '../components/SchedulerViewHeader';
import { SchedulerRunContent } from '../components/SchedulerRunContent';
import type { TaskRun } from '../types/index';

export function SchedulerView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runSelectorOpen, setRunSelectorOpen] = useState(false);
  const taskNeedsPollRef = useRef(false);
  const isRunningRef = useRef(false);
  const waitingForRunAfterRef = useRef<string | null>(null);

  // Query: scheduled task
  const {
    data: task,
    isLoading: taskLoading,
    error: taskError,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ['scheduled-task', taskId],
    queryFn: () => api.getScheduledTask(taskId!),
    enabled: !!taskId,
    refetchInterval: () => (taskNeedsPollRef.current ? POLL_INTERVALS.schedulerActive : false),
  });

  // Query: task runs
  const {
    data: runs = [],
    isLoading: runsLoading,
    refetch: refetchRuns,
  } = useQuery<TaskRun[]>({
    queryKey: ['task-runs', taskId],
    queryFn: () => api.listTaskRuns(taskId!),
    enabled: !!taskId,
    refetchInterval: () => (isRunningRef.current ? POLL_INTERVALS.schedulerActive : false),
  });

  const rerunMutation = useCrudMutation(
    () => api.rerunScheduledTask(taskId!),
    [
      ['scheduled-task', taskId],
      ['task-runs', taskId],
    ],
    {
      onSuccess: () => {
        // Store current latest run so auto-select waits for a newer one
        waitingForRunAfterRef.current = runs[0]?.id ?? null;
        setSelectedRunId(null);
        isRunningRef.current = true;
      },
    }
  );

  const loading = taskLoading || runsLoading;

  useEffect(() => {
    taskNeedsPollRef.current = task?.isQueued || task?.isRunning || false;
  }, [task?.isQueued, task?.isRunning]);

  useEffect(() => {
    const selectedRun = runs.find((r: TaskRun) => r.id === selectedRunId);
    // Keep polling when selected run is running OR when task itself is running (cron may create a new run)
    isRunningRef.current =
      selectedRun?.status === 'running' || task?.isRunning || task?.isQueued || false;
  }, [runs, selectedRunId, task?.isRunning, task?.isQueued]);

  // Track the previously known latest run to detect new runs
  const prevLatestRunIdRef = useRef<string | null>(null);

  // Auto-select latest run:
  // 1. On initial load (no selection yet)
  // 2. After a manual rerun (waitingForRunAfterRef set)
  // 3. When a new run appears and the user is already viewing the latest run
  useEffect(() => {
    if (runs.length === 0) return;
    const latestRunId = runs[0]?.id;

    if (waitingForRunAfterRef.current !== null) {
      // After a rerun, wait until a newer run appears before auto-selecting
      if (latestRunId !== waitingForRunAfterRef.current) {
        waitingForRunAfterRef.current = null;
        prevLatestRunIdRef.current = latestRunId;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedRunId(latestRunId);
      }
      return;
    }

    if (!selectedRunId) {
      prevLatestRunIdRef.current = latestRunId;
      const id = setTimeout(() => setSelectedRunId(latestRunId), 0);
      return () => clearTimeout(id);
    }

    // If a new run appeared and user is currently viewing the previous latest run, follow it
    if (
      prevLatestRunIdRef.current &&
      latestRunId !== prevLatestRunIdRef.current &&
      selectedRunId === prevLatestRunIdRef.current
    ) {
      prevLatestRunIdRef.current = latestRunId;
      setSelectedRunId(latestRunId);
      return;
    }

    prevLatestRunIdRef.current = latestRunId;
  }, [runs, selectedRunId]);

  const handleBack = () => navigate('/scheduler');

  const handleRefresh = async () => {
    await refetchTask();
    await refetchRuns();
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId);

  const error = taskError
    ? taskError instanceof Error
      ? taskError.message
      : 'Failed to load task'
    : null;

  if (loading) {
    return (
      <div className="safe-area-top safe-area-bottom flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-foreground">Loading...</span>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="safe-area-top safe-area-bottom flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-foreground">Scheduled Task</span>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <Clock className="h-16 w-16 text-muted-foreground/50" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">{error || 'Task not found'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Go back to the scheduler</p>
          </div>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Scheduler
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <SchedulerViewHeader
        task={task}
        rerunMutation={rerunMutation}
        onBack={handleBack}
        onRefresh={handleRefresh}
      />

      {/* Run selector */}
      <div className="border-b border-border px-4 py-2">
        <RunSelector
          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={setSelectedRunId}
          isOpen={runSelectorOpen}
          onToggle={() => setRunSelectorOpen(!runSelectorOpen)}
        />
      </div>

      <SchedulerRunContent runs={runs} selectedRun={selectedRun} />
    </div>
  );
}
