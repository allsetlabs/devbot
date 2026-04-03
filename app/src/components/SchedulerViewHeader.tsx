import { ArrowLeft, Clock, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import type { UseMutationResult } from '@tanstack/react-query';
import type { ScheduledTask } from '../types/index';

interface SchedulerViewHeaderProps {
  task: ScheduledTask;
  rerunMutation: UseMutationResult<{ success: boolean; message: string }, Error, void>;
  onBack: () => void;
  onRefresh: () => void;
}

export function SchedulerViewHeader({
  task,
  rerunMutation,
  onBack,
  onRefresh,
}: SchedulerViewHeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            {task.isRunning ? (
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            ) : task.isQueued ? (
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-warning" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {task.isRunning ? 'Running' : task.isQueued ? 'Queued' : 'Task History'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => rerunMutation.mutate()}
            disabled={task.isRunning || task.isQueued || rerunMutation.isPending}
            title="Rerun task"
          >
            {rerunMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <p className="line-clamp-2 text-xs text-muted-foreground">{task.prompt}</p>
      </div>
    </>
  );
}
