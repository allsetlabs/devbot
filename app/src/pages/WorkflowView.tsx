import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { useIncrementalMessages } from '../hooks/useIncrementalMessages';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { api } from '../lib/api';
import { POLL_INTERVALS } from '../lib/constants';
import { WorkflowViewHeader } from '../components/WorkflowViewHeader';
import { WorkflowRunSelector } from '../components/WorkflowRunSelector';
import { WorkflowStepList } from '../components/WorkflowStepList';
import { WorkflowStepOutput } from '../components/WorkflowStepOutput';
import { WorkflowStatusBar } from '../components/WorkflowStatusBar';
import type { WorkflowRun, WorkflowStepRun, TaskMessage } from '../types';

export function WorkflowView() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepRunId, setSelectedStepRunId] = useState<string | null>(null);
  const isActiveRef = useRef(false);

  // Incremental message loading for workflow steps
  const stepMessageFetchFn = useCallback(
    async (afterSequence: number) => {
      const newMsgs = await api.getWorkflowStepMessages(
        workflowId!,
        selectedRunId!,
        selectedStepRunId!,
        afterSequence
      );
      return newMsgs.map<TaskMessage>((m: any) => ({
        id: m.id,
        runId: m.stepRunId,
        sequence: m.sequence,
        type: m.type as TaskMessage['type'],
        content: m.content,
        createdAt: m.createdAt,
      }));
    },
    [workflowId, selectedRunId, selectedStepRunId]
  );
  const {
    messages,
    fetchMessages,
    lastSequenceRef,
    reset: resetMessages,
  } = useIncrementalMessages(
    workflowId && selectedRunId && selectedStepRunId ? stepMessageFetchFn : null
  );

  const { data: workflow, isLoading: wfLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => api.getWorkflow(workflowId!),
    enabled: !!workflowId,
  });

  const { data: runs = [] } = useQuery<WorkflowRun[]>({
    queryKey: ['workflow-runs', workflowId],
    queryFn: () => api.listWorkflowRuns(workflowId!),
    enabled: !!workflowId,
    refetchInterval: () => (isActiveRef.current ? POLL_INTERVALS.workflowActive : 10000),
  });

  const { data: stepRuns = [], dataUpdatedAt: stepDataUpdatedAt } = useQuery<WorkflowStepRun[]>({
    queryKey: ['workflow-step-runs', workflowId, selectedRunId],
    queryFn: () => api.listWorkflowStepRuns(workflowId!, selectedRunId!),
    enabled: !!workflowId && !!selectedRunId,
    refetchInterval: () => (isActiveRef.current ? POLL_INTERVALS.workflowActive : false),
  });

  const runMutation = useCrudMutation(
    () => api.startWorkflowRun(workflowId!),
    [['workflow-runs', workflowId]],
    {
      onSuccess: (run) => {
        setSelectedRunId(run.id);
        setSelectedStepRunId(null);
      },
    }
  );

  const cancelMutation = useCrudMutation(
    () => api.cancelWorkflowRun(workflowId!, selectedRunId!),
    [
      ['workflow-runs', workflowId],
      ['workflow-step-runs', workflowId, selectedRunId],
    ]
  );

  useEffect(() => {
    const selectedRun = runs.find((r) => r.id === selectedRunId);
    isActiveRef.current = selectedRun?.status === 'running' || selectedRun?.status === 'pending';
  }, [runs, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      const id = setTimeout(() => setSelectedRunId(runs[0].id), 0);
      return () => clearTimeout(id);
    }
  }, [runs, selectedRunId]);

  useEffect(() => {
    if (selectedStepRunId) {
      const id = setTimeout(() => {
        resetMessages();
        fetchMessages(0);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [selectedStepRunId, fetchMessages, resetMessages]);

  useEffect(() => {
    if (!selectedStepRunId || stepDataUpdatedAt === 0) return;
    const step = stepRuns.find((s) => s.id === selectedStepRunId);
    if (step?.status === 'running') {
      fetchMessages(lastSequenceRef.current);
    }
  }, [selectedStepRunId, stepDataUpdatedAt, stepRuns, fetchMessages]);

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const selectedStep = stepRuns.find((s) => s.id === selectedStepRunId);
  const isRunActive = selectedRun?.status === 'running' || selectedRun?.status === 'pending';

  if (wfLoading) {
    return (
      <div className="safe-area-top safe-area-bottom flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-foreground">Loading...</span>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setSelectedStepRunId(null);
    resetMessages();
  };

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <WorkflowViewHeader
        workflowName={workflow?.name}
        isRunActive={isRunActive}
        isRunPending={runMutation.isPending}
        isCancelPending={cancelMutation.isPending}
        onBack={() => navigate('/workflows')}
        onRun={() => runMutation.mutate()}
        onCancel={() => cancelMutation.mutate()}
      />

      <WorkflowRunSelector
        runs={runs}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
      />

      <WorkflowStepList
        stepRuns={stepRuns}
        selectedRunId={selectedRunId}
        selectedStepRunId={selectedStepRunId}
        onSelectStep={setSelectedStepRunId}
      />

      <WorkflowStepOutput
        selectedStepRunId={selectedStepRunId}
        selectedStep={selectedStep}
        messages={messages}
        hasSteps={stepRuns.length > 0}
      />

      <WorkflowStatusBar selectedRun={selectedRun} stepRuns={stepRuns} isRunActive={isRunActive} />
    </div>
  );
}
