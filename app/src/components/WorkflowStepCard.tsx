import { Loader2, CheckCircle2, XCircle, Clock, SkipForward } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { WorkflowStepRun } from '../types';

interface WorkflowStepCardProps {
  stepRun: WorkflowStepRun;
  isSelected: boolean;
  onSelect: () => void;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-muted-foreground' },
  running: { icon: Loader2, color: 'text-primary', animate: true },
  completed: { icon: CheckCircle2, color: 'text-primary' },
  failed: { icon: XCircle, color: 'text-destructive' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground' },
} as const;

export function WorkflowStepCard({ stepRun, isSelected, onSelect }: WorkflowStepCardProps) {
  const config = statusConfig[stepRun.status];
  const Icon = config.icon;

  return (
    <Button
      variant="ghost"
      onClick={onSelect}
      className={`flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${config.color} ${'animate' in config && config.animate ? 'animate-spin' : ''}`}
      />
      <span className="truncate">{stepRun.name || `Step ${stepRun.order + 1}`}</span>
    </Button>
  );
}
