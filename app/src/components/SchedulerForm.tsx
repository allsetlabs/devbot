import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import { X, Infinity as InfinityIcon } from 'lucide-react';
import { MAX_RUNS_PRESETS, INTERVAL_OPTIONS } from '../lib/constants';
import { WorkingDirSelector, useValidateAndSaveDir } from './WorkingDirSelector';
import { ModelPicker } from './ModelPicker';
import type { ClaudeModel, TriggerType, TaskPriority, EffortLevel, CreateScheduledTaskRequest } from '../types';

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

interface SchedulerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScheduledTaskRequest) => Promise<void>;
}

export function SchedulerForm({ isOpen, onClose, onSubmit }: SchedulerFormProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('interval');
  const [cronExpression, setCronExpression] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [maxRuns, setMaxRuns] = useState<number | null>(10);
  const [isInfinite, setIsInfinite] = useState(false);
  const [workingDir, setWorkingDir] = useState('');
  const [model, setModel] = useState<ClaudeModel>('sonnet');
  const [effort, setEffort] = useState<EffortLevel | ''>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [contextFile, setContextFile] = useState('');

  const validateAndSaveDir = useValidateAndSaveDir();

  const resetForm = () => {
    setName('');
    setPrompt('');
    setTriggerType('interval');
    setCronExpression('');
    setIntervalMinutes(60);
    setMaxRuns(10);
    setIsInfinite(false);
    setWorkingDir('');
    setModel('sonnet');
    setEffort('');
    setPriority('medium');
    setContextFile('');
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      await validateAndSaveDir(workingDir);
      const data: CreateScheduledTaskRequest = {
        prompt: prompt.trim(),
        triggerType,
        priority,
        name: name.trim() || undefined,
        model,
        workingDir,
      };
      if (triggerType === 'cron') {
        data.cronExpression = cronExpression.trim();
      } else {
        data.intervalMinutes = intervalMinutes;
      }
      if (triggerType !== 'once') {
        data.maxRuns = isInfinite ? null : maxRuns;
      }
      if (effort) {
        data.effort = effort;
      }
      if (contextFile.trim()) {
        data.contextFile = contextFile.trim();
      }
      return onSubmit(data);
    },
    onSuccess: () => {
      resetForm();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (triggerType === 'cron' && !cronExpression.trim()) return;
    submitMutation.mutate();
  };

  const handleClose = () => {
    resetForm();
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
      <div className="safe-area-bottom flex max-h-[70vh] w-full max-w-lg flex-col rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">New Scheduled Task</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Error */}
        {submitMutation.error && (
          <div className="mb-4 shrink-0 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitMutation.error instanceof Error
              ? submitMutation.error.message
              : 'Failed to create task'}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="-mr-4 flex-1 space-y-4 overflow-y-auto pr-4">
            {/* Name (optional) */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional — auto-generated if left empty"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Trigger Type */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Trigger Type</span>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Trigger type">
                {TRIGGER_TYPE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    type="button"
                    onClick={() => setTriggerType(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
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
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">Cron Expression</span>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 */2 * * * (every 2 hours)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Format: minute hour day-of-month month day-of-week
                </p>
              </div>
            )}

            {/* Interval Selection (shown for interval and once) */}
            {(triggerType === 'interval' || triggerType === 'once') && (
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">
                  {triggerType === 'once' ? 'Minimum delay before rerun' : 'Run every'}
                </span>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Run interval">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant="outline"
                      type="button"
                      onClick={() => setIntervalMinutes(opt.value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
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

            {/* Max Runs Selection (hidden for once trigger) */}
            {triggerType !== 'once' && (
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">Maximum runs</span>
                <div className="flex items-center gap-2" role="group" aria-label="Maximum runs">
                  <div className="grid flex-1 grid-cols-4 gap-2">
                    {MAX_RUNS_PRESETS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant="outline"
                        type="button"
                        disabled={isInfinite}
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
                    onClick={handleInfiniteToggle}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
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
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Priority</span>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Priority">
                {PRIORITY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
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

            {/* Task Prompt */}
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="mb-2 block text-sm font-medium text-foreground">Task Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter the task for Claude to execute..."
                rows={5}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This prompt will be sent to Claude Code on the configured schedule
              </p>
            </div>

            {/* Model + Effort row */}
            <div className="grid grid-cols-2 gap-4">
              <ModelPicker value={model} onChange={setModel} />
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">Effort</span>
                <div className="grid grid-cols-3 gap-1" role="group" aria-label="Effort level">
                  {EFFORT_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant="outline"
                      type="button"
                      onClick={() => setEffort(effort === opt.value ? '' : opt.value)}
                      className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition-colors ${
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

            {/* Context File (optional) */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Context File</span>
              <input
                type="text"
                value={contextFile}
                onChange={(e) => setContextFile(e.target.value)}
                placeholder="Optional — path to file injected as context"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                File contents are prepended to the prompt each run (e.g., BACKLOG.md for inter-session context)
              </p>
            </div>

            {/* Working Directory */}
            <WorkingDirSelector value={workingDir} onChange={setWorkingDir} />
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-2 pt-4">
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
