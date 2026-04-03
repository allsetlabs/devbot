import { Button } from '@subbiah/reusable/components/ui/button';
import { Trash2, Play } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { ModulePlan } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  dismissed: 'bg-muted text-muted-foreground',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};

interface PlanListItemProps {
  plan: ModulePlan;
  onSelect: (plan: ModulePlan) => void;
  onDelete: (id: string) => void;
  onExecute: (plan: ModulePlan) => void;
  isExecuting: boolean;
}

export function PlanListItem({
  plan,
  onSelect,
  onDelete,
  onExecute,
  isExecuting,
}: PlanListItemProps) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors active:bg-muted/50"
      onClick={() => onSelect(plan)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(plan)}
      role="button"
      tabIndex={0}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[plan.status] || ''}`}
          >
            {plan.status.replace('_', ' ')}
          </span>
          <span className={`text-[10px] font-medium ${PRIORITY_COLORS[plan.priority] || ''}`}>
            {plan.priority}
          </span>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">{plan.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {plan.route} &middot; {formatRelativeTime(plan.createdAt)}
        </p>
      </div>
      <div className="mt-1 flex flex-shrink-0 items-center gap-1">
        {plan.status !== 'completed' && plan.status !== 'dismissed' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isExecuting}
            onClick={(e) => {
              e.stopPropagation();
              onExecute(plan);
            }}
          >
            <Play className="h-4 w-4 text-primary" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(plan.id);
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
