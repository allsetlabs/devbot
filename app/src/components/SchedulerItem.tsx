import { Button } from '@subbiah/reusable/components/ui/button';
import { useTemporaryStatus } from '../hooks/useTemporaryStatus';
import { Trash2, Pause, Play, MessageSquare, CheckCircle, Settings, RotateCcw } from 'lucide-react';
import type { ScheduledTask } from '../types';
import { formatDateTime, formatInterval } from '../lib/format';

interface SchedulerItemProps {
  task: ScheduledTask;
  onDelete: () => void;
  onTogglePause: () => void;
  onViewHistory: () => void;
  onSettings: () => void;
  onRerun: () => void;
}

export function SchedulerItem({
  task,
  onDelete,
  onTogglePause,
  onViewHistory,
  onSettings,
  onRerun,
}: SchedulerItemProps) {
  const {
    status: deleteConfirm,
    show: showDeleteConfirm,
    clear: clearDeleteConfirm,
  } = useTemporaryStatus(3000);

  const handleDeleteClick = () => {
    if (deleteConfirm) {
      onDelete();
      clearDeleteConfirm();
    } else {
      showDeleteConfirm('confirm');
    }
  };

  const isPaused = task.status === 'paused';
  const isRunning = task.isRunning;
  const isQueued = task.isQueued;
  const isCompleted = task.maxRuns !== null && task.runCount >= task.maxRuns;

  // Format run count display
  const runCountDisplay =
    task.maxRuns !== null ? `${task.runCount} / ${task.maxRuns}` : `${task.runCount}`;

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/50"
      onClick={onViewHistory}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewHistory();
        }
      }}
    >
      {/* Status indicator */}
      <div className="mt-1.5 flex-shrink-0">
        {isCompleted ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isRunning
                ? 'animate-pulse bg-primary'
                : isQueued
                  ? 'animate-pulse bg-warning'
                  : isPaused
                    ? 'bg-muted-foreground'
                    : 'bg-success'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm text-foreground">{task.name || task.prompt}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Every {formatInterval(task.intervalMinutes)}</span>
          <span>Runs: {runCountDisplay}</span>
          {isCompleted && <span className="font-medium text-success">Completed</span>}
          {isRunning && !isCompleted && (
            <span className="font-medium text-primary">Running...</span>
          )}
          {isQueued && !isRunning && !isCompleted && (
            <span className="font-medium text-warning">Queued</span>
          )}
          {!isRunning && !isCompleted && task.lastRunAt && (
            <span>Last: {formatDateTime(task.lastRunAt)}</span>
          )}
          {!isRunning && !isCompleted && task.nextRunAt && !isPaused && (
            <span>Next: {formatDateTime(task.nextRunAt)}</span>
          )}
          {isPaused && !isCompleted && <span className="text-warning">Paused</span>}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-shrink-0 items-center gap-1"
        role="toolbar"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onRerun}
          className="h-8 w-8"
          disabled={isRunning || isQueued}
        >
          <RotateCcw className="h-4 w-4 text-primary" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettings} className="h-8 w-8">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onViewHistory} className="h-8 w-8">
          <MessageSquare className="h-4 w-4 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePause}
          className="h-8 w-8"
          disabled={isRunning || isCompleted}
        >
          {isPaused ? (
            <Play className="h-4 w-4 text-success" />
          ) : (
            <Pause className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant={deleteConfirm ? 'destructive' : 'ghost'}
          size="icon"
          onClick={handleDeleteClick}
          className="h-8 w-8"
          disabled={isRunning}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
