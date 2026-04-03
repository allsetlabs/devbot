import { useNavigate } from 'react-router-dom';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Clock, ChevronRight, Pause, Play } from 'lucide-react';
import { formatDateTime, formatInterval } from '../lib/format';
import type { ScheduledTask } from '../types';

export function SchedulerWidget({ tasks }: { tasks: ScheduledTask[] }) {
  const navigate = useNavigate();
  const active = tasks.filter((t) => t.status === 'active');
  const paused = tasks.filter((t) => t.status === 'paused');
  const running = tasks.filter((t) => t.isRunning);

  const nextRun = active
    .filter((t) => t.nextRunAt)
    .sort((a, b) => new Date(a.nextRunAt!).getTime() - new Date(b.nextRunAt!).getTime())[0];

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/scheduler')}
      className="h-auto flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left active:bg-muted"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Scheduler</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Play className="h-3.5 w-3.5 text-success" />
          <span className="text-lg font-bold text-foreground">{active.length}</span>
        </div>
        {paused.length > 0 && (
          <div className="flex items-center gap-1">
            <Pause className="h-3.5 w-3.5 text-warning" />
            <span className="text-lg font-bold text-foreground">{paused.length}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {running.length > 0 && <span className="text-primary">{running.length} running now</span>}
        {nextRun?.nextRunAt && (
          <span className="truncate">
            Next: {formatDateTime(nextRun.nextRunAt)} ({formatInterval(nextRun.intervalMinutes)})
          </span>
        )}
        {active.length === 0 && paused.length === 0 && <span>No tasks</span>}
      </div>
    </Button>
  );
}
