import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@allsetlabs/forge/components/ui/flow-graph';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';

/** Nodes drag only from this handle (set as the node's `dragHandle`), so the inputs stay editable. */
export const DRAG_HANDLE_CLASS = 'fh-drag-handle';

export interface PersonNodeData {
  person: Person;
  isRoot: boolean;
  onChangeName: (id: string, v: string) => void;
  onChangeTranslit: (id: string, v: string) => void;
  onDelete: (id: string) => void;
  [key: string]: unknown; // ReactFlow's node data must be an index signature record
}

const HANDLE_CLASS = '!h-3.5 !w-3.5 !border-2 !border-background !bg-primary hover:!bg-primary/80';

function PersonFlowNodeImpl({ id, data }: NodeProps) {
  const d = data as unknown as PersonNodeData;
  const p = d.person;

  return (
    <div
      className={cn(
        'group relative w-[190px] rounded-xl border border-border bg-card/95 px-2 py-1.5 shadow-lg',
        p.uncertain && 'border-destructive/60'
      )}
    >
      {/* incoming connector (from parent) docks at the top; drag out from the bottom to add a child */}
      {!d.isRoot && <Handle type="target" position={Position.Top} className={HANDLE_CLASS} />}

      {/* grip bar — the node's drag handle (inputs stay editable) */}
      <div
        className={cn(
          DRAG_HANDLE_CLASS,
          'flex cursor-grab items-center justify-center py-0.5 text-muted-foreground/50 active:cursor-grabbing'
        )}
      >
        <GripHorizontal className="h-3.5 w-3.5" />
      </div>

      <div className="space-y-1">
        <Input
          value={p.name}
          onChange={(e) => d.onChangeName(id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="பெயர் · name"
          aria-label="Name"
          className={cn(
            'nodrag nopan h-6 rounded-md px-1.5 text-center text-[14px] font-semibold',
            p.uncertain && 'border-destructive/60 text-destructive'
          )}
        />
        <Input
          value={p.translit}
          onChange={(e) => d.onChangeTranslit(id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="transliteration"
          aria-label="Transliteration"
          className="nodrag nopan h-6 rounded-md px-1.5 text-center text-[11px] text-muted-foreground"
        />
      </div>

      {!d.isRoot && (
        <Button
          type="button"
          size="icon-sm"
          variant="destructive"
          onClick={() => d.onDelete(id)}
          aria-label="Delete node and its descendants"
          className="nodrag absolute -right-2 -top-2 h-5 w-5 rounded-full opacity-0 shadow transition-opacity group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
    </div>
  );
}

export const PersonFlowNode = memo(PersonFlowNodeImpl);
