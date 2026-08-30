import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/forge/components/ui/drawer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@allsetlabs/forge/components/ui/tooltip';
import { Infinity as InfinityIcon, Loader2 } from 'lucide-react';
import type {
  ScheduledTask,
  ClaudeModel,
  TriggerType,
  TaskPriority,
  EffortLevel,
  UpdateScheduledTaskRequest,
} from '../types';
import { MAX_RUNS_PRESETS, INTERVAL_OPTIONS } from '../lib/constants';
import { ModelPicker } from './ModelPicker';
import { WorkingDirSelector, useValidateAndSaveDir } from './WorkingDirSelector';

const TRIGGER_TYPE_OPTIONS: { label: string; value: TriggerType; description: string }[] = [
  { label: 'Interval', value: 'interval', description: 'Run at fixed intervals' },
  { label: 'Cron', value: 'cron', description: 'Cron expression schedule' },
  { label: 'Once', value: 'once', description: 'Run once and stop' },
  { label: 'Event', value: 'event', description: 'Triggered by events' },
];

const PRIORITY_OPTIONS: { label: string; value: TaskPriority; color: string }[] = [
  { label: 'Low', value: 'low', color: 'text-muted-foreground' },
  { label: 'Medium', value: 'medium', color: 'text-foreground' },
  { label: 'High', value: 'high', color: 'text-orange-500' },
  { label: 'Critical', value: 'critical', color: 'text-destructive' },
];

const EFFORT_OPTIONS: { label: string; value: EffortLevel }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'XHigh', value: 'xhigh' },
  { label: 'Max', value: 'max' },
];

interface SchedulerSettingsDrawerProps {
  task: ScheduledTask | null;
  open: boolean;
  onClose: () => void;
  onSave: (taskId: string, data: UpdateScheduledTaskRequest) => Promise<void>;
}

export function SchedulerSettingsDrawer({
  task,
  open,
  onClose,
  onSave,
}: SchedulerSettingsDrawerProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('interval');
  const [cronExpression, setCronExpression] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [maxRuns, setMaxRuns] = useState<number | null>(10);
  const [isInfinite, setIsInfinite] = useState(false);
  const [model, setModel] = useState<ClaudeModel>('sonnet');
  const [effort, setEffort] = useState<EffortLevel | ''>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [contextFile, setContextFile] = useState('');
  const [workingDir, setWorkingDir] = useState('');

  const validateAndSaveDir = useValidateAndSaveDir();

  const saveMutation = useMutation({
    mutationFn: (updates: UpdateScheduledTaskRequest) => onSave(task!.id, updates),
    onSuccess: () => onClose(),
  });

  // Sync form state when task changes
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(task.name ?? '');
      setPrompt(task.prompt);
      setTriggerType(task.triggerType ?? 'interval');
      setCronExpression(task.cronExpression ?? '');
      setIntervalMinutes(task.intervalMinutes);
      setMaxRuns(task.maxRuns);
      setIsInfinite(task.maxRuns === null);
      setModel(task.model);
      setEffort(task.effort ?? '');
      setPriority(task.priority ?? 'medium');
      setContextFile(task.contextFile ?? '');
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

    const updates: UpdateScheduledTaskRequest = {};
    if (name.trim() !== (task.name ?? '')) updates.name = name.trim();
    if (prompt.trim() !== task.prompt) updates.prompt = prompt.trim();
    if (triggerType !== task.triggerType) updates.triggerType = triggerType;
    if (cronExpression.trim() !== (task.cronExpression ?? ''))
      updates.cronExpression = cronExpression.trim() || null;
    if (intervalMinutes !== task.intervalMinutes) updates.intervalMinutes = intervalMinutes;
    const newMaxRuns = isInfinite ? null : maxRuns;
    if (newMaxRuns !== task.maxRuns) updates.maxRuns = newMaxRuns;
    if (model !== task.model) updates.model = model;
    const newEffort = effort || null;
    if (newEffort !== (task.effort ?? null)) updates.effort = newEffort;
    if (priority !== task.priority) updates.priority = priority;
    if (contextFile.trim() !== (task.contextFile ?? ''))
      updates.contextFile = contextFile.trim() || null;

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
      triggerType !== task.triggerType ||
      cronExpression.trim() !== (task.cronExpression ?? '') ||
      intervalMinutes !== task.intervalMinutes ||
      (isInfinite ? null : maxRuns) !== task.maxRuns ||
      model !== task.model ||
      (effort || null) !== (task.effort ?? null) ||
      priority !== task.priority ||
      contextFile.trim() !== (task.contextFile ?? '') ||
      (workingDir.trim() || null) !== (task.workingDir ?? null));

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="flex flex-col">
        <DrawerHeader>
          <DrawerTitle className="text-left">Scheduler Settings</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6" data-vaul-no-drag>
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

          {/* Trigger Type */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Trigger Type</span>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Trigger type">
              {TRIGGER_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  type="button"
                  disabled={task?.isSystem}
                  onClick={() => setTriggerType(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    triggerType === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground md:hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {TRIGGER_TYPE_OPTIONS.find((o) => o.value === triggerType)?.description}
            </p>
          </div>

          {/* Cron Expression (shown only for cron trigger) */}
          {triggerType === 'cron' && (
            <div className="mb-4">
              <span className="mb-2 block text-sm font-medium text-foreground">
                Cron Expression
              </span>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                disabled={task?.isSystem}
                placeholder="0 */2 * * * (every 2 hours)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          )}

          {/* Interval (shown for interval and once) */}
          {(triggerType === 'interval' || triggerType === 'once') && (
            <div className="mb-4">
              <span className="mb-2 block text-sm font-medium text-foreground">
                {triggerType === 'once' ? 'Minimum delay before rerun' : 'Run every'}
              </span>
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
                        : 'border-border text-foreground md:hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Max Runs (hidden for once trigger) */}
          {triggerType !== 'once' && (
            <div className="mb-4">
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
                          : 'border-border text-foreground md:hover:bg-muted disabled:opacity-50'
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
                      : 'border-border text-foreground md:hover:bg-muted'
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
          )}

          {/* Priority */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Priority</span>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Priority">
              {PRIORITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  type="button"
                  disabled={task?.isSystem}
                  onClick={() => setPriority(opt.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    priority === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : `border-border ${opt.color} md:hover:bg-muted`
                  }`}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
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

          {/* Model + Effort row */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <ModelPicker value={model} onChange={setModel} disabled={task?.isSystem} />
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Effort</span>
              <div className="grid grid-cols-3 gap-1" role="group" aria-label="Effort level">
                {EFFORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    type="button"
                    disabled={task?.isSystem}
                    onClick={() => setEffort(effort === opt.value ? '' : opt.value)}
                    className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      effort === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground md:hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Context File */}
          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-foreground">Context File</span>
            <input
              type="text"
              value={contextFile}
              onChange={(e) => setContextFile(e.target.value)}
              disabled={task?.isSystem}
              placeholder="Optional — path to file injected as context"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              File contents are prepended to the prompt each run
            </p>
          </div>

          {/* Working Directory */}
          <div className="mb-6">
            <WorkingDirSelector value={workingDir} onChange={setWorkingDir} />
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
                      disabled={
                        saveMutation.isPending || !hasChanges || !prompt.trim() || task?.isSystem
                      }
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : null}
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
