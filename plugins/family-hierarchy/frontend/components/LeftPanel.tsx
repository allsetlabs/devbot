import { Users, GitBranch, AlertTriangle, Pencil, ArrowRight } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Badge } from '@allsetlabs/forge/components/ui/badge';
import { ScrollArea } from '@allsetlabs/forge/components/ui/scroll-area';
import { Separator } from '@allsetlabs/forge/components/ui/separator';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { FamilyTree, Person } from '../types';
import { pathToRoot } from '../lib/tree';

interface Props {
  tree: FamilyTree;
  selected: Person | null;
  view: 'details' | 'uncertain';
  editMode: boolean;
  peopleCount: number;
  generationCount: number;
  uncertainList: Person[];
  onSetView: (v: 'details' | 'uncertain') => void;
  onSelectPerson: (id: string) => void;
  onEditSelected: () => void;
}

export function LeftPanel({
  tree,
  selected,
  view,
  editMode,
  peopleCount,
  generationCount,
  uncertainList,
  onSetView,
  onSelectPerson,
  onEditSelected,
}: Props) {
  const { people } = tree;

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-border bg-background/60">
      <div className="p-5 pb-3">
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">வாரிசுகள்</div>
        <h1 className="mt-1 text-2xl font-bold italic leading-tight">Family Hierarchy</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {tree.meta.titleTranslit}. {tree.meta.subtitle}. Compiled {tree.meta.year}.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat icon={<Users className="h-3.5 w-3.5" />} label="People" value={peopleCount} />
          <Stat icon={<GitBranch className="h-3.5 w-3.5" />} label="Gens" value={generationCount} />
          <button
            type="button"
            onClick={() => onSetView('uncertain')}
            className={cn(
              'rounded-lg border p-2 text-left transition-colors hover:border-destructive/60',
              view === 'uncertain' ? 'border-destructive/60 bg-destructive/5' : 'border-border'
            )}
          >
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-lg font-semibold leading-none">{uncertainList.length}</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Uncertain</div>
          </button>
        </div>

        <div className="mt-4 flex rounded-lg border border-border p-0.5">
          <TabBtn active={view === 'details'} onClick={() => onSetView('details')}>
            Details
          </TabBtn>
          <TabBtn active={view === 'uncertain'} onClick={() => onSetView('uncertain')}>
            Uncertain ({uncertainList.length})
          </TabBtn>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        {view === 'details' ? (
          <DetailView
            people={people}
            selected={selected}
            editMode={editMode}
            onSelectPerson={onSelectPerson}
            onEditSelected={onEditSelected}
          />
        ) : (
          <UncertainView people={people} list={uncertainList} onSelectPerson={onSelectPerson} />
        )}
      </ScrollArea>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <div className="flex items-center gap-1 text-foreground">
        {icon}
        <span className="text-lg font-semibold leading-none">{value}</span>
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function DetailView({
  people,
  selected,
  editMode,
  onSelectPerson,
  onEditSelected,
}: {
  people: Record<string, Person>;
  selected: Person | null;
  editMode: boolean;
  onSelectPerson: (id: string) => void;
  onEditSelected: () => void;
}) {
  if (!selected) {
    return <div className="p-5 text-sm text-muted-foreground">Select a person in the graph to see their details.</div>;
  }
  const lineage = pathToRoot(people, selected.id)
    .slice(1)
    .reverse()
    .map((id) => people[id]);

  return (
    <div className="space-y-4 p-5">
      <div>
        <div className={cn('text-xl font-bold', selected.uncertain && 'text-destructive')}>{selected.name || '—'}</div>
        {selected.translit && <div className="text-sm text-muted-foreground">{selected.translit}</div>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.marker === 'A' && <Badge variant="primary">A — வாலிபர் (adult)</Badge>}
          {selected.marker === 'M' && <Badge variant="secondary">M — சிறுவர் (minor)</Badge>}
          {selected.sourcePages?.length > 0 && (
            <Badge variant="outline">
              {selected.sourcePages.length === 1 ? 'book page' : 'book pages'} {selected.sourcePages.join(', ')}
            </Badge>
          )}
        </div>
      </div>

      {selected.uncertain && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <div className="text-xs font-medium text-destructive">Uncertain name reading</div>
          {selected.uncertainReason && (
            <div className="mt-0.5 text-xs text-muted-foreground">{selected.uncertainReason}</div>
          )}
          {editMode && <div className="mt-1 text-[11px] text-muted-foreground">Use Edit to correct it or mark it as correct.</div>}
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
                <button className="hover:text-foreground hover:underline" onClick={() => onSelectPerson(p.id)}>
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
          {selected.children.length === 0 && <div className="text-sm text-muted-foreground">No recorded children.</div>}
          {selected.children.map((cid) => (
            <button
              key={cid}
              onClick={() => onSelectPerson(cid)}
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
  );
}

function UncertainView({
  people,
  list,
  onSelectPerson,
}: {
  people: Record<string, Person>;
  list: Person[];
  onSelectPerson: (id: string) => void;
}) {
  if (list.length === 0) {
    return <div className="p-5 text-sm text-muted-foreground">No uncertain names remaining. 🎉</div>;
  }
  return (
    <div className="space-y-1.5 p-3">
      <div className="px-2 pb-1 text-xs text-muted-foreground">
        {list.length} name{list.length !== 1 && 's'} need verification. Click to locate; use Edit mode to correct or confirm.
      </div>
      {list.map((p) => {
        const lineage = pathToRoot(people, p.id).slice(1).reverse();
        return (
          <button
            key={p.id}
            onClick={() => onSelectPerson(p.id)}
            className="w-full rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-left transition-colors hover:border-destructive/70"
          >
            <div className="text-sm font-semibold text-destructive">{p.name || '—'}</div>
            {p.uncertainReason && <div className="mt-0.5 text-[11px] text-muted-foreground">{p.uncertainReason}</div>}
            {lineage.length > 0 && (
              <div className="mt-1 truncate text-[10px] text-muted-foreground">
                {lineage.map((id) => people[id].name).join(' › ')}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
