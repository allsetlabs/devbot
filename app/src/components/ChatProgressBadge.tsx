import { HelpCircle, CheckCircle2, XCircle, GitPullRequest, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@allsetlabs/forge/components/ui/tooltip';

const KNOWN_VALUES = ['question', 'done', 'success', 'failure', 'PR'] as const;

function getIcon(progress: string) {
  switch (progress) {
    case 'question':
      return <HelpCircle className="h-3.5 w-3.5 text-yellow-500" />;
    case 'done':
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'failure':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case 'PR':
      return <GitPullRequest className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

interface ChatProgressBadgeProps {
  progress: string | null;
}

export function ChatProgressBadge({ progress }: ChatProgressBadgeProps) {
  if (!progress) return null;

  const isKnown = (KNOWN_VALUES as readonly string[]).includes(progress);
  const tooltipText = isKnown ? progress : progress;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex-shrink-0">{getIcon(progress)}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="max-w-[200px] text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
