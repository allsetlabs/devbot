import {
  ChevronsDownUp,
  ChevronsUpDown,
  Maximize,
  Pencil,
  Check,
  X,
  Loader2,
  LayoutDashboard,
  Info,
} from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@allsetlabs/forge/components/ui/tooltip';
import type { Language } from '../lib/useGraphSettings';

interface Props {
  editMode: boolean;
  saving: boolean;
  layoutOpen: boolean;
  language: Language;
  onEnterEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onFit: () => void;
  onToggleLayout: () => void;
  onToggleLanguage: () => void;
  onInfo: () => void;
}

function TBtn({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? 'default' : 'ghost'}
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="dark">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GraphToolbar({
  editMode,
  saving,
  layoutOpen,
  language,
  onEnterEdit,
  onSaveEdit,
  onCancelEdit,
  onExpandAll,
  onCollapseAll,
  onFit,
  onToggleLayout,
  onToggleLanguage,
  onInfo,
}: Props) {
  // Edit mode is a free-form flow canvas with its own controls — the header only needs save / cancel.
  if (editMode) {
    return (
      <div className="flex items-center gap-1">
        <TBtn label="Save all changes" active onClick={onSaveEdit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </TBtn>
        <TBtn label="Cancel — discard changes" onClick={onCancelEdit} disabled={saving}>
          <X className="h-4 w-4" />
        </TBtn>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <TBtn label="Edit — rename, connect, add, delete" onClick={onEnterEdit}>
        <Pencil className="h-4 w-4" />
      </TBtn>

      <div className="mx-0.5 h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLanguage}
            aria-label={language === 'ta' ? 'Language: Tamil — switch to English' : 'Language: English — switch to Tamil'}
            className="text-sm font-semibold"
          >
            {language === 'ta' ? 'த' : 'A'}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="dark">
          {language === 'ta' ? 'Tamil names — switch to English' : 'English names — switch to Tamil'}
        </TooltipContent>
      </Tooltip>

      <div className="mx-0.5 h-6 w-px bg-border" />

      <TBtn label="Expand all" onClick={onExpandAll}>
        <ChevronsUpDown className="h-4 w-4" />
      </TBtn>
      <TBtn label="Collapse all" onClick={onCollapseAll}>
        <ChevronsDownUp className="h-4 w-4" />
      </TBtn>
      <TBtn label="Fit to screen" onClick={onFit}>
        <Maximize className="h-4 w-4" />
      </TBtn>

      <div className="mx-0.5 h-6 w-px bg-border" />

      <TBtn label={layoutOpen ? 'Close layout panel' : 'Layout'} active={layoutOpen} onClick={onToggleLayout}>
        <LayoutDashboard className="h-4 w-4" />
      </TBtn>
      <TBtn label="About · stats · uncertain names" onClick={onInfo}>
        <Info className="h-4 w-4" />
      </TBtn>
    </div>
  );
}
