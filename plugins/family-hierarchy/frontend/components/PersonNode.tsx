import { Minus, Plus } from 'lucide-react';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';
import type { Language } from '../lib/useGraphSettings';

interface Props {
  person: Person;
  language: Language; // read-only view shows a single name (Tamil or English), toggled from the header
  selected: boolean;
  hovered: boolean;
  neighbor: boolean;
  inSelectedPath: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onHover: (on: boolean) => void;
}

export function PersonNode({
  person,
  language,
  selected,
  hovered,
  neighbor,
  inSelectedPath,
  expanded,
  onSelect,
  onToggle,
  onHover,
}: Props) {
  const hasChildren = person.children.length > 0;
  const label = (language === 'ta' ? person.name : person.translit) || person.name || person.translit || '—';

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
          // parent / child / ancestor chain of the hovered node — border only, no tint
          neighbor && !selected && 'border-primary',
          // hover — tint the hovered node itself
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
            title={label}
          >
            {label}
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
      </button>

      {/* expand / collapse toggle — a circle straddling the node's bottom-right corner */}
      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="absolute -bottom-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-border bg-card px-1 text-[9px] font-semibold leading-none text-muted-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
          {!expanded && <span>{person.children.length}</span>}
        </button>
      )}
    </div>
  );
}
