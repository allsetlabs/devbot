import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@allsetlabs/forge/components/ui/flow-graph';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';
import type { Language } from '../lib/useGraphSettings';

/**
 * Read-only node for the ReactFlow view. Mirrors PersonNode's look (glowing card, selection ring,
 * lineage border) but shows a *single* language line — the whole reason for this view is that two
 * names per node blow up the horizontal footprint. The corner button expands / collapses.
 */
export interface PersonViewNodeData {
  person: Person;
  language: Language;
  isRoot: boolean;
  selected: boolean;
  hovered: boolean;
  neighbor: boolean; // part of the hovered node's neighbourhood (children + ancestor chain)
  inSelectedPath: boolean; // ancestor of the selected node
  expanded: boolean;
  direction: 'down' | 'right';
  onSelect: () => void;
  onToggle: () => void;
  onHover: (on: boolean) => void;
  [key: string]: unknown; // ReactFlow node data must be an index-signature record
}

// This view is fixed-width so the tidy layout stays deterministic (no per-node measuring).
export const VIEW_NODE_WIDTH = 168;
export const VIEW_NODE_HEIGHT = 48;

const HANDLE_CLASS = '!h-1.5 !w-1.5 !border-0 !bg-primary/0';

function PersonFlowViewNodeImpl({ data }: NodeProps) {
  const d = data as unknown as PersonViewNodeData;
  const p = d.person;
  const hasChildren = p.children.length > 0;
  const label = (d.language === 'ta' ? p.name : p.translit) || p.name || p.translit || '—';

  const vertical = d.direction === 'down';
  const targetPos = vertical ? Position.Top : Position.Left;
  const sourcePos = vertical ? Position.Bottom : Position.Right;

  return (
    <div
      className="group relative"
      style={{ width: VIEW_NODE_WIDTH }}
      onMouseEnter={() => d.onHover(true)}
      onMouseLeave={() => d.onHover(false)}
    >
      {!d.isRoot && <Handle type="target" position={targetPos} className={HANDLE_CLASS} isConnectable={false} />}

      <button
        type="button"
        onClick={d.onSelect}
        className={cn(
          'w-full rounded-xl border border-border bg-card/85 px-3 py-2 text-center backdrop-blur-sm transition-all duration-150',
          'shadow-[0_4px_16px_-8px_rgba(0,0,0,0.7)]',
          d.inSelectedPath && 'border-primary',
          d.neighbor && !d.selected && 'border-primary',
          d.hovered && !d.selected && 'bg-primary/20',
          d.selected &&
            'border-primary bg-primary/20 ring-2 ring-primary/60 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.7)]'
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <span
            className={cn(
              'min-w-0 truncate text-[14px] font-semibold leading-tight',
              p.uncertain ? 'text-destructive' : 'text-card-foreground'
            )}
            title={label}
          >
            {label}
          </span>
          {p.marker === 'A' && (
            <Badge variant="primary" className="shrink-0 px-1 py-0 text-[9px]">
              A
            </Badge>
          )}
          {p.marker === 'M' && (
            <Badge variant="secondary" className="shrink-0 px-1 py-0 text-[9px]">
              M
            </Badge>
          )}
        </div>
      </button>

      {hasChildren && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            d.onToggle();
          }}
          className="absolute -bottom-2 -right-2 z-10 flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border border-border bg-card px-1 text-[9px] font-semibold leading-none text-muted-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={d.expanded ? 'Collapse' : 'Expand'}
        >
          {d.expanded ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
          {!d.expanded && <span>{p.children.length}</span>}
        </button>
      )}

      <Handle type="source" position={sourcePos} className={HANDLE_CLASS} isConnectable={false} />
    </div>
  );
}

export const PersonFlowViewNode = memo(PersonFlowViewNodeImpl);
