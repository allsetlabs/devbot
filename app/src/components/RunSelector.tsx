import { ChevronDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { TaskRun } from '../types';
import { formatDateTime } from '../lib/format';

interface RunSelectorProps {
  runs: TaskRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

function RunStatusIcon({ status }: { status: TaskRun['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    case 'completed':
      return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}

export function RunSelector({
  runs,
  selectedRunId,
  onSelectRun,
  isOpen,
  onToggle,
}: RunSelectorProps) {
  const selectedRun = runs.find((r) => r.id === selectedRunId);

  if (runs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="text-sm text-muted-foreground">No runs yet</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {selectedRun && <RunStatusIcon status={selectedRun.status} />}
          <span className="text-sm font-medium text-foreground">
            {selectedRun ? `Run #${selectedRun.runIndex}` : 'Select run'}
          </span>
          {selectedRun && (
            <span className="text-xs text-muted-foreground">
              {formatDateTime(selectedRun.startedAt)}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
          {runs.map((run) => (
            <Button
              key={run.id}
              variant="ghost"
              onClick={() => {
                onSelectRun(run.id);
                onToggle();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                run.id === selectedRunId ? 'bg-muted' : ''
              }`}
            >
              <RunStatusIcon status={run.status} />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Run #{run.runIndex}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatDateTime(run.startedAt)}
                </span>
              </div>
              {run.status === 'failed' && run.errorMessage && (
                <span className="max-w-[150px] truncate text-xs text-destructive">
                  {run.errorMessage}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
