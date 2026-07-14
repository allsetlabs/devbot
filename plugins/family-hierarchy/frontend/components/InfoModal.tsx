import { Users, GitBranch, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@allsetlabs/forge/components/ui/dialog';
import type { FamilyTree, Person } from '../types';
import { pathToRoot } from '../lib/tree';

interface Props {
  open: boolean;
  tree: FamilyTree;
  peopleCount: number;
  generationCount: number;
  uncertainList: Person[];
  onClose: () => void;
  onSelectPerson: (id: string) => void;
}

export function InfoModal({
  open,
  tree,
  peopleCount,
  generationCount,
  uncertainList,
  onClose,
  onSelectPerson,
}: Props) {
  const { people } = tree;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="dark grid-rows-[auto_auto_minmax(0,1fr)] max-w-md bg-background text-foreground">
        <DialogHeader className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">வாரிசுகள்</div>
          <DialogTitle className="text-2xl font-bold italic leading-tight">Family Hierarchy</DialogTitle>
          <DialogDescription className="break-words">
            {tree.meta.titleTranslit}. {tree.meta.subtitle}. Compiled {tree.meta.year}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 grid-cols-3 gap-2">
          <Stat icon={<Users className="h-3.5 w-3.5" />} label="People" value={peopleCount} />
          <Stat icon={<GitBranch className="h-3.5 w-3.5" />} label="Gens" value={generationCount} />
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-2">
            <div className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-lg font-semibold leading-none">{uncertainList.length}</span>
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">Uncertain</div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Uncertain names ({uncertainList.length})
          </div>
          {uncertainList.length === 0 ? (
            <div className="text-sm text-muted-foreground">No uncertain names remaining. 🎉</div>
          ) : (
            <div className="max-h-[46vh] min-w-0 space-y-1.5 overflow-y-auto pr-1">
              {uncertainList.map((p) => {
                const lineage = pathToRoot(people, p.id).slice(1).reverse();
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPerson(p.id)}
                    className="block w-full min-w-0 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-left transition-colors hover:border-destructive/70"
                  >
                    <div className="text-sm font-semibold text-destructive">{p.name || '—'}</div>
                    {p.uncertainReason && (
                      <div className="mt-0.5 break-words text-[11px] text-muted-foreground">{p.uncertainReason}</div>
                    )}
                    {lineage.length > 0 && (
                      <div className="mt-1 truncate text-[10px] text-muted-foreground">
                        {lineage.map((id) => people[id].name).join(' › ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
