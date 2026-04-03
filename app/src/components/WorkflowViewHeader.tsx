import { Button } from '@subbiah/reusable/components/ui/button';
import { ArrowLeft, GitBranch, Play, Loader2, XCircle } from 'lucide-react';

interface WorkflowViewHeaderProps {
  workflowName: string | undefined;
  isRunActive: boolean;
  isRunPending: boolean;
  isCancelPending: boolean;
  onBack: () => void;
  onRun: () => void;
  onCancel: () => void;
}

export function WorkflowViewHeader({
  workflowName,
  isRunActive,
  isRunPending,
  isCancelPending,
  onBack,
  onRun,
  onCancel,
}: WorkflowViewHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <GitBranch className="h-5 w-5 text-primary" />
        <span className="truncate text-sm font-medium text-foreground">
          {workflowName || 'Workflow'}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {isRunActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={isCancelPending}
            title="Cancel run"
          >
            <XCircle className="h-5 w-5 text-destructive" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRun}
          disabled={isRunPending || isRunActive}
          title="Run workflow"
        >
          {isRunPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
