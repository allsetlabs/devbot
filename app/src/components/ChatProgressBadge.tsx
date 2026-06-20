import { useState } from 'react';
import { CheckCircle2, XCircle, GitPullRequest, Activity, FileDiff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@allsetlabs/forge/components/ui/tooltip';

function getIcon(progress: string) {
  const lower = progress.trim().toLowerCase();
  if (lower === 'done' || lower === 'success') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  }
  if (lower === 'failure' || lower === 'error' || lower.startsWith('failed')) {
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
  if (lower === 'pr' || lower.startsWith('pr ') || lower.startsWith('pr #')) {
    return <GitPullRequest className="h-3.5 w-3.5 text-primary" />;
  }
  if (lower === 'dirty' || lower.startsWith('dirty')) {
    return <FileDiff className="h-3.5 w-3.5 text-warning" />;
  }
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

interface ChatProgressBadgeProps {
  progress: string | null;
  showTooltip?: boolean;
}

export function ChatProgressBadge({ progress, showTooltip = true }: ChatProgressBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (!progress) return null;

  const icon = getIcon(progress);

  if (!showTooltip) {
    return <span className="flex-shrink-0">{icon}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <span
            className="flex-shrink-0 cursor-help transition-opacity md:hover:opacity-80"
            tabIndex={0}
            aria-label={`Progress: ${progress}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setTooltipOpen((open) => !open);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              event.stopPropagation();
              setTooltipOpen((open) => !open);
            }}
            style={{ WebkitUserSelect: 'none' }}
          >
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-[200px] text-xs">{progress}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
