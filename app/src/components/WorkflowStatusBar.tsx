import { Loader2 } from 'lucide-react';
import type { WorkflowRun, WorkflowStepRun } from '../types';

interface WorkflowStatusBarProps {
  selectedRun: WorkflowRun | undefined;
  stepRuns: WorkflowStepRun[];
  isRunActive: boolean;
}

export function WorkflowStatusBar({ selectedRun, stepRuns, isRunActive }: WorkflowStatusBarProps) {
  if (!selectedRun) return null;

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {stepRuns.filter((s) => s.status === 'completed').length}/{stepRuns.length} steps
          completed
        </span>
        {isRunActive && (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {selectedRun.status === 'running' ? 'Running' : 'Pending'}
          </span>
        )}
        {selectedRun.status === 'failed' && (
          <span className="text-destructive">{selectedRun.errorMessage || 'Failed'}</span>
        )}
        {selectedRun.status === 'completed' && <span className="text-primary">Completed</span>}
      </div>
    </div>
  );
}
