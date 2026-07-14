import { Minus, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@allsetlabs/forge/components/ui/tooltip';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';

interface Props {
  person: Person;
  isRoot: boolean;
  selected: boolean;
  hovered: boolean;
  neighbor: boolean;
  inSelectedPath: boolean;
  expanded: boolean;
  editMode: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onHover: (on: boolean) => void;
  onEdit: () => void;
  onAdd: () => void;
  onDelete: () => void;
}

export function PersonNode({
  person,
  isRoot,
  selected,
  hovered,
  neighbor,
  inSelectedPath,
  expanded,
  editMode,
  onSelect,
  onToggle,
  onHover,
  onEdit,
  onAdd,
  onDelete,
}: Props) {
  const hasChildren = person.children.length > 0;

  return (
    <div className="group relative" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full rounded-xl border border-border bg-card/85 px-3 py-2 text-center backdrop-blur-sm transition-all duration-150',
          'shadow-[0_4px_16px_-8px_rgba(0,0,0,0.7)] hover:-translate-y-0.5',
          // ancestor of the selected node — border only, so the lineage reads as a spine
          inSelectedPath && 'border-primary',
          // parent / child of the hovered node — highlighted border + faint tint
          neighbor && !selected && 'border-primary bg-primary/10',
          // hover — tint the background (lines stay as-is)
          hovered && !selected && 'bg-primary/20',
          // selected — tinted background + primary border
          selected &&
            'border-primary bg-primary/20 ring-2 ring-primary/60 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.7)]'
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <span
            className={cn(
              'min-w-0 truncate text-[15px] font-semibold leading-tight',
              person.uncertain ? 'text-destructive' : 'text-card-foreground'
            )}
            title={person.name}
          >
            {person.name || '—'}
          </span>
          {person.marker === 'A' && (
            <Badge variant="primary" className="shrink-0 px-1 py-0 text-[9px]">
              A
            </Badge>
          )}
          {person.marker === 'M' && (
            <Badge variant="secondary" className="shrink-0 px-1 py-0 text-[9px]">
              M
            </Badge>
          )}
        </div>
        {person.translit && (
          <div className="truncate text-[12px] leading-tight text-muted-foreground" title={person.translit}>
            {person.translit}
          </div>
        )}
      </button>

      {/* expand / collapse toggle — a circle straddling the node's bottom-right corner */}
      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'absolute -bottom-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-border bg-card px-1 text-[9px] font-semibold leading-none text-muted-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground'
          )}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
          {!expanded && <span>{person.children.length}</span>}
        </button>
      )}

      {/* edit-mode affordances */}
      {editMode && (selected || false) && (
        <div className="absolute -right-1 -top-3 z-20 flex gap-0.5">
          <IconAction label="Edit person" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </IconAction>
          <IconAction label="Add child" onClick={onAdd}>
            <UserPlus className="h-3 w-3" />
          </IconAction>
          {!isRoot && (
            <IconAction label="Delete (with descendants)" destructive onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </IconAction>
          )}
        </div>
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant={destructive ? 'destructive' : 'secondary'}
          className="h-6 w-6 rounded-full shadow"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="dark">{label}</TooltipContent>
    </Tooltip>
  );
}
