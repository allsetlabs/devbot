import { Pencil, ArrowRight, X } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { ScrollArea } from '@allsetlabs/forge/components/ui/scroll-area';
import { Separator } from '@allsetlabs/forge/components/ui/separator';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';
import { pathToRoot } from '../lib/tree';

interface Props {
  people: Record<string, Person>;
  selected: Person;
  editMode: boolean;
  onClose: () => void;
  onSelectPerson: (id: string) => void;
  onHoverPerson: (id: string | null) => void;
  onEditSelected: () => void;
}

export function DetailPanel({
  people,
  selected,
  editMode,
  onClose,
  onSelectPerson,
  onHoverPerson,
  onEditSelected,
}: Props) {
  const lineage = pathToRoot(people, selected.id)
    .slice(1)
    .reverse()
    .map((id) => people[id]);

  return (
    <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <div className="min-w-0">
          <div className={cn('truncate text-xl font-bold', selected.uncertain && 'text-destructive')}>
            {selected.name || '—'}
          </div>
          {selected.translit && <div className="truncate text-sm text-muted-foreground">{selected.translit}</div>}
        </div>
        <Button variant="ghost" size="icon" className="-mr-1 -mt-1 shrink-0" onClick={onClose} aria-label="Close details">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-1.5">
            {selected.marker === 'A' && <Badge variant="primary">A — வாலிபர் (adult)</Badge>}
            {selected.marker === 'M' && <Badge variant="secondary">M — சிறுவர் (minor)</Badge>}
            {selected.sourcePages?.length > 0 && (
              <Badge variant="outline">
                {selected.sourcePages.length === 1 ? 'book page' : 'book pages'} {selected.sourcePages.join(', ')}
              </Badge>
            )}
          </div>

          {selected.uncertain && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <div className="text-xs font-medium text-destructive">Uncertain name reading</div>
              {selected.uncertainReason && (
                <div className="mt-0.5 text-xs text-muted-foreground">{selected.uncertainReason}</div>
              )}
              {editMode && (
                <div className="mt-1 text-[11px] text-muted-foreground">Use Edit to correct it or mark it as correct.</div>
              )}
            </div>
          )}

          {selected.note && (
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
              <div className="mt-1 text-sm">{selected.note}</div>
            </div>
          )}

          {lineage.length > 0 && (
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lineage</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lineage.map((p, i) => (
                  <span key={p.id}>
                    <button
                      className="hover:text-foreground hover:underline"
                      onClick={() => onSelectPerson(p.id)}
                      onMouseEnter={() => onHoverPerson(p.id)}
                      onMouseLeave={() => onHoverPerson(null)}
                    >
                      {p.name}
                    </button>
                    {i < lineage.length - 1 && <span className="px-1">›</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Children ({selected.children.length})
            </div>
            <div className="mt-1 space-y-0.5">
              {selected.children.length === 0 && (
                <div className="text-sm text-muted-foreground">No recorded children.</div>
              )}
              {selected.children.map((cid) => (
                <button
                  key={cid}
                  onClick={() => onSelectPerson(cid)}
                  onMouseEnter={() => onHoverPerson(cid)}
                  onMouseLeave={() => onHoverPerson(null)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-accent"
                >
                  <span className={cn('truncate', people[cid].uncertain && 'text-destructive')}>{people[cid].name}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {editMode && (
            <Button variant="outline" size="sm" className="w-full" onClick={onEditSelected}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit this person
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
