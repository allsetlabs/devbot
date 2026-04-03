import { Loader2, GitBranch } from 'lucide-react';
import { WorkflowStepCard } from './WorkflowStepCard';
import type { WorkflowStepRun } from '../types';

interface WorkflowStepListProps {
  stepRuns: WorkflowStepRun[];
  selectedRunId: string | null;
  selectedStepRunId: string | null;
  onSelectStep: (stepId: string) => void;
}

export function WorkflowStepList({
  stepRuns,
  selectedRunId,
  selectedStepRunId,
  onSelectStep,
}: WorkflowStepListProps) {
  if (stepRuns.length > 0) {
    return (
      <div className="border-b border-border">
        <div className="max-h-48 overflow-y-auto px-4 py-2">
          <div className="space-y-2">
            {stepRuns.map((step) => (
              <WorkflowStepCard
                key={step.id}
                stepRun={step}
                isSelected={selectedStepRunId === step.id}
                onSelect={() => onSelectStep(step.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedRunId) {
    return (
      <div className="flex items-center justify-center border-b border-border px-4 py-4">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Preparing steps...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-8">
      <GitBranch className="h-12 w-12 text-muted-foreground/50" />
      <p className="text-center text-sm text-muted-foreground">
        No runs yet. Click play to start the workflow.
      </p>
    </div>
  );
}
