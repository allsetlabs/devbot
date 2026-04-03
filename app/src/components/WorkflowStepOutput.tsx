import { Loader2 } from 'lucide-react';
import { MessageList } from './MessageList';
import type { TaskMessage, WorkflowStepRun } from '../types';

interface WorkflowStepOutputProps {
  selectedStepRunId: string | null;
  selectedStep: WorkflowStepRun | undefined;
  messages: TaskMessage[];
  hasSteps: boolean;
}

export function WorkflowStepOutput({
  selectedStepRunId,
  selectedStep,
  messages,
  hasSteps,
}: WorkflowStepOutputProps) {
  if (selectedStepRunId && messages.length > 0) {
    return <MessageList messages={messages} isRunning={selectedStep?.status === 'running'} />;
  }

  if (selectedStepRunId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
        {selectedStep?.status === 'running' ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Waiting for output...</p>
          </>
        ) : selectedStep?.status === 'pending' ? (
          <p className="text-sm text-muted-foreground">Step waiting to start...</p>
        ) : (
          <p className="text-sm text-muted-foreground">No messages for this step</p>
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">
        {hasSteps ? 'Select a step to view its output' : ''}
      </p>
    </main>
  );
}
