import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Play, Pause, Loader2 } from 'lucide-react';
import { formatRelativeFuture, formatInterval } from '../lib/format';
import type { ScheduledTask } from '../types';

export function DashboardActiveSchedulers({ tasks }: { tasks: ScheduledTask[] }) {
  const navigate = useNavigate();
  const visible = tasks.filter((t) => t.status !== 'deleted').slice(0, 5);

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Schedulers</span>
        </div>
        <button
          onClick={() => navigate('/scheduler')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y divide-border">
        {visible.map((task) => (
          <button
            key={task.id}
            onClick={() => navigate('/scheduler')}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted"
          >
            <div className="flex-shrink-0">
              {task.isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : task.status === 'paused' ? (
                <Pause className="h-4 w-4 text-warning" />
              ) : (
                <Play className="h-4 w-4 text-success" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {task.name || task.prompt.slice(0, 50)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatInterval(task.intervalMinutes)}</span>
                {task.nextRunAt && task.status === 'active' && (
                  <>
                    <span>·</span>
                    <span>Next: {formatRelativeFuture(task.nextRunAt)}</span>
                  </>
                )}
                {task.status === 'paused' && <span className="text-warning">Paused</span>}
                {task.isRunning && <span className="text-primary">Running now</span>}
              </div>
            </div>
            {task.runCount > 0 && (
              <span className="flex-shrink-0 text-xs text-muted-foreground">
                {task.runCount} runs
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
