import { Loader2 } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { WorkflowRun } from '../types';

interface WorkflowRunSelectorProps {
  runs: WorkflowRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

export function WorkflowRunSelector({
  runs,
  selectedRunId,
  onSelectRun,
}: WorkflowRunSelectorProps) {
  if (runs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <span className="text-xs text-muted-foreground">Run:</span>
      <div className="flex flex-1 gap-1 overflow-x-auto">
        {runs.slice(0, 10).map((run) => (
          <Button
            key={run.id}
            variant="ghost"
            onClick={() => onSelectRun(run.id)}
            className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
              selectedRunId === run.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {run.status === 'running' && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
            {run.id.slice(0, 6)}
          </Button>
        ))}
      </div>
    </div>
  );
}
