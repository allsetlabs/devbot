import { Button } from '@subbiah/reusable/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';
import { ExternalLink, Play } from 'lucide-react';
import { MarkdownContent } from '../lib/plan-markdown';
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

interface PlanDetailDrawerProps {
  plan: ModulePlan | null;
  onClose: () => void;
  onExecute: (plan: ModulePlan) => void;
  onStatusChange: (plan: ModulePlan, status: ModulePlan['status']) => void;
  isExecuting: boolean;
}

export function PlanDetailDrawer({
  plan,
  onClose,
  onExecute,
  onStatusChange,
  isExecuting,
}: PlanDetailDrawerProps) {
  return (
    <Drawer open={plan !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-left">{plan?.title}</DrawerTitle>
        </DrawerHeader>
        {plan && (
          <div className="overflow-y-auto px-4 pb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[plan.status] || ''}`}
              >
                {plan.status.replace('_', ' ')}
              </span>
              <span className={`text-xs font-medium ${PRIORITY_COLORS[plan.priority] || ''}`}>
                {plan.priority} priority
              </span>
              <span className="text-xs text-muted-foreground">Route: {plan.route}</span>
            </div>

            {plan.source && (
              <div className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Source: {plan.source}</span>
                {plan.sourceUrl && (
                  <a
                    href={plan.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            <div className="mb-4 border-t border-border pt-3">
              <MarkdownContent content={plan.description} />
            </div>

            <div className="flex gap-2">
              {plan.status !== 'completed' && plan.status !== 'dismissed' && (
                <Button
                  size="sm"
                  disabled={isExecuting}
                  onClick={() => onExecute(plan)}
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  Execute
                </Button>
              )}
              {plan.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => onStatusChange(plan, 'dismissed')}>
                  Dismiss
                </Button>
              )}
              {plan.status === 'dismissed' && (
                <Button size="sm" variant="outline" onClick={() => onStatusChange(plan, 'pending')}>
                  Reopen
                </Button>
              )}
              {(plan.status === 'pending' || plan.status === 'in_progress') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(plan, 'completed')}
                >
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
