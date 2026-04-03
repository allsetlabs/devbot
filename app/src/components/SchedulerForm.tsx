import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@subbiah/reusable/components/ui/button';
import { X, Infinity as InfinityIcon } from 'lucide-react';
import { MAX_RUNS_PRESETS, INTERVAL_OPTIONS } from '../lib/constants';

interface SchedulerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, intervalMinutes: number, maxRuns: number | null) => Promise<void>;
}

export function SchedulerForm({ isOpen, onClose, onSubmit }: SchedulerFormProps) {
  const [prompt, setPrompt] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [maxRuns, setMaxRuns] = useState<number | null>(10);
  const [isInfinite, setIsInfinite] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () => onSubmit(prompt.trim(), intervalMinutes, isInfinite ? null : maxRuns),
    onSuccess: () => {
      setPrompt('');
      setIntervalMinutes(60);
      setMaxRuns(10);
      setIsInfinite(false);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    submitMutation.mutate();
  };

  const handleClose = () => {
    setPrompt('');
    setIntervalMinutes(60);
    setMaxRuns(10);
    setIsInfinite(false);
    submitMutation.reset();
    onClose();
  };

  const handleInfiniteToggle = () => {
    setIsInfinite(!isInfinite);
    if (!isInfinite) {
      setMaxRuns(null);
    } else {
      setMaxRuns(10);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="safe-area-bottom w-full max-w-lg rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">New Scheduled Task</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Error */}
        {submitMutation.error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitMutation.error instanceof Error
              ? submitMutation.error.message
              : 'Failed to create task'}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Interval Selection */}
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Run every</span>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Run interval">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntervalMinutes(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    intervalMinutes === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Runs Selection */}
          <div>
            <span className="mb-2 block text-sm font-medium text-foreground">Maximum runs</span>
            <div className="flex items-center gap-2" role="group" aria-label="Maximum runs">
              <div className="grid flex-1 grid-cols-4 gap-2">
                {MAX_RUNS_PRESETS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isInfinite}
                    onClick={() => setMaxRuns(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      !isInfinite && maxRuns === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground hover:bg-muted disabled:opacity-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleInfiniteToggle}
                className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  isInfinite
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <InfinityIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isInfinite
                ? 'Task will run indefinitely until paused'
                : maxRuns === 1
                  ? 'Task will run once and stop'
                  : `Task will run ${maxRuns} times and stop`}
            </p>
          </div>

          {/* Task Prompt */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Task Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the task for Claude to execute..."
              rows={5}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This prompt will be sent to Claude Code at the specified interval
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={submitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitMutation.isPending || !prompt.trim()}
            >
              {submitMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
