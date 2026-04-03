import { Button } from '@subbiah/reusable/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@subbiah/reusable/components/ui/tooltip';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  ClipboardPaste,
  Trash2,
} from 'lucide-react';

interface KeyBarProps {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onPaste?: () => void;
  onClear?: () => void;
}

interface ActionButtonProps {
  onClick?: () => void;
  tooltip: string;
  children: React.ReactNode;
}

function ActionButton({ onClick, tooltip, children }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function KeyBar({
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onPaste,
  onClear,
}: KeyBarProps) {
  return (
    <TooltipProvider>
      <div className="flex shrink-0 items-center justify-around border-t border-border bg-card px-2 py-2 md:hidden">
        <ActionButton onClick={onArrowUp} tooltip="Up">
          <ArrowUp className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onArrowDown} tooltip="Down">
          <ArrowDown className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onArrowLeft} tooltip="Left">
          <ArrowLeft className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onArrowRight} tooltip="Right">
          <ArrowRight className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onEnter} tooltip="Enter">
          <CornerDownLeft className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onPaste} tooltip="Paste">
          <ClipboardPaste className="h-4 w-4" />
        </ActionButton>
        <ActionButton onClick={onClear} tooltip="Clear">
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      </div>
    </TooltipProvider>
  );
}
