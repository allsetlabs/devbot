import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Textarea } from '@allsetlabs/reusable/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@allsetlabs/reusable/components/ui/tooltip';
import { Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import type { ScheduledTask, ClaudeModel } from '../types';
import { MAX_RUNS_PRESETS, INTERVAL_OPTIONS } from '../lib/constants';
import { ModelPicker } from './ModelPicker';
import { WorkingDirSelector, useValidateAndSaveDir } from './WorkingDirSelector';

interface SchedulerSettingsDrawerProps {
  task: ScheduledTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    taskId: string,
    data: { prompt?: string; intervalMinutes?: number; maxRuns?: number | null; name?: string; model?: ClaudeModel; workingDir?: string | null }
  ) => Promise<void>;
}

export function SchedulerSettingsDrawer({
  task,
  open,
  onClose,
  onSave,
}: SchedulerSettingsDrawerProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [maxRuns, setMaxRuns] = useState<number | null>(10);
  const [isInfinite, setIsInfinite] = useState(false);
  const [model, setModel] = useState<ClaudeModel>('sonnet');
  const [workingDir, setWorkingDir] = useState('');

  const validateAndSaveDir = useValidateAndSaveDir();

  const saveMutation = useMutation({
    mutationFn: (updates: { prompt?: string; intervalMinutes?: number; maxRuns?: number | null; name?: string; model?: ClaudeModel; workingDir?: string | null }) =>
      onSave(task!.id, updates),
    onSuccess: () => onClose(),
  });

  // Sync form state when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(task.name ?? '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrompt(task.prompt);

      setIntervalMinutes(task.intervalMinutes);

      setMaxRuns(task.maxRuns);

      setIsInfinite(task.maxRuns === null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModel(task.model);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkingDir(task.workingDir ?? '');
      saveMutation.reset();
    }
  }, [task]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInfiniteToggle = () => {
    if (isInfinite) {
      setIsInfinite(false);
      setMaxRuns(10);
    } else {
      setIsInfinite(true);
      setMaxRuns(null);
    }
  };

  const handleSave = async () => {
    if (!task || !prompt.trim()) return;

    const updates: { prompt?: string; intervalMinutes?: number; maxRuns?: number | null; name?: string; model?: ClaudeModel; workingDir?: string | null } = {};
    if (name.trim() !== (task.name ?? '')) updates.name = name.trim();
    if (prompt.trim() !== task.prompt) updates.prompt = prompt.trim();
    if (intervalMinutes !== task.intervalMinutes) updates.intervalMinutes = intervalMinutes;
    const newMaxRuns = isInfinite ? null : maxRuns;
    if (newMaxRuns !== task.maxRuns) updates.maxRuns = newMaxRuns;
    if (model !== task.model) updates.model = model;

    const normalizedDir = workingDir.trim() || null;
    const originalDir = task.workingDir ?? null;
    if (normalizedDir !== originalDir) {
      await validateAndSaveDir(workingDir.trim());
      updates.workingDir = normalizedDir;
    }

    if (Object.keys(updates).length > 0) {
      saveMutation.mutate(updates);
    } else {
      onClose();
    }
  };

  const hasChanges =
    task &&
    (name.trim() !== (task.name ?? '') ||
      prompt.trim() !== task.prompt ||
      intervalMinutes !== task.intervalMinutes ||
      (isInfinite ? null : maxRuns) !== task.maxRuns ||
      model !== task.model ||
      (workingDir.trim() || null) !== (task.workingDir ?? null));

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-left">Scheduler Settings</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6" data-vaul-no-drag>
          {saveMutation.error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Failed to save'}
            </div>
          )}

          {/* Name */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={task?.isSystem}
              placeholder="Task name"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Task Prompt</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              disabled={task?.isSystem}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Interval */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Run every</span>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Run interval">
              {INTERVAL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  type="button"
                  disabled={task?.isSystem}
                  onClick={() => setIntervalMinutes(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    intervalMinutes === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Max Runs */}
          <div className="mb-6">
            <span className="mb-2 block text-sm font-medium text-foreground">Maximum runs</span>
            <div className="flex items-center gap-2" role="group" aria-label="Maximum runs">
              <div className="grid flex-1 grid-cols-4 gap-2">
                {MAX_RUNS_PRESETS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    type="button"
                    disabled={isInfinite || task?.isSystem}
                    onClick={() => setMaxRuns(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      !isInfinite && maxRuns === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground hover:bg-muted disabled:opacity-50'
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                type="button"
                disabled={task?.isSystem}
                onClick={handleInfiniteToggle}
                className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isInfinite
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <InfinityIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isInfinite
                ? 'Task will run indefinitely until paused'
                : maxRuns === 1
                  ? 'Task will run once and stop'
                  : `Task will run ${maxRuns} times and stop`}
            </p>
          </div>

          {/* Model */}
          <div className="mb-6">
            <ModelPicker value={model} onChange={setModel} disabled={task?.isSystem} />
          </div>

          {/* Working Directory */}
          <div className="mb-6">
            <WorkingDirSelector
              value={workingDir}
              onChange={setWorkingDir}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex-1">
                    <Button
                      onClick={handleSave}
                      className="w-full"
                      disabled={saveMutation.isPending || !hasChanges || !prompt.trim() || task?.isSystem}
                    >
                      {saveMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {task?.isSystem && (
                  <TooltipContent>System schedulers cannot be modified</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
