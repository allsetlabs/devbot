import {
  ChevronsDownUp,
  ChevronsUpDown,
  Layers,
  Maximize,
  ZoomIn,
  ZoomOut,
  Pencil,
  Check,
  Loader2,
  TriangleAlert,
  Save,
} from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@allsetlabs/forge/components/ui/tooltip';
import { cn } from '@allsetlabs/forge/lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  editMode: boolean;
  saveState: SaveState;
  onToggleEdit: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandLayer: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function TBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? 'default' : 'ghost'} size="icon" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="dark">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GraphToolbar({
  editMode,
  saveState,
  onToggleEdit,
  onExpandAll,
  onCollapseAll,
  onExpandLayer,
  onFit,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-lg backdrop-blur">
      <TBtn label={editMode ? 'Exit edit mode' : 'Edit mode (add / remove / rename)'} active={editMode} onClick={onToggleEdit}>
        <Pencil className="h-4 w-4" />
      </TBtn>
      <div className="mx-0.5 h-6 w-px bg-border" />
      <TBtn label="Expand all" onClick={onExpandAll}>
        <ChevronsUpDown className="h-4 w-4" />
      </TBtn>
      <TBtn label="Expand one more layer" onClick={onExpandLayer}>
        <Layers className="h-4 w-4" />
      </TBtn>
      <TBtn label="Collapse all" onClick={onCollapseAll}>
        <ChevronsDownUp className="h-4 w-4" />
      </TBtn>
      <div className="mx-0.5 h-6 w-px bg-border" />
      <TBtn label="Fit to screen" onClick={onFit}>
        <Maximize className="h-4 w-4" />
      </TBtn>
      <TBtn label="Zoom in" onClick={onZoomIn}>
        <ZoomIn className="h-4 w-4" />
      </TBtn>
      <TBtn label="Zoom out" onClick={onZoomOut}>
        <ZoomOut className="h-4 w-4" />
      </TBtn>
      <div className="mx-0.5 h-6 w-px bg-border" />
      <div className={cn('flex items-center gap-1 px-2 text-xs', saveStateColor(saveState))} title="Save status">
        {saveState === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {saveState === 'saved' && <Check className="h-3.5 w-3.5" />}
        {saveState === 'error' && <TriangleAlert className="h-3.5 w-3.5" />}
        {saveState === 'idle' && <Save className="h-3.5 w-3.5" />}
        <span>{saveStateLabel(saveState)}</span>
      </div>
    </div>
  );
}

function saveStateColor(s: SaveState): string {
  if (s === 'saved') return 'text-success';
  if (s === 'error') return 'text-destructive';
  if (s === 'saving') return 'text-primary';
  return 'text-muted-foreground';
}
function saveStateLabel(s: SaveState): string {
  return s === 'saving' ? 'Saving…' : s === 'saved' ? 'Saved' : s === 'error' ? 'Save failed' : 'Saved';
}
