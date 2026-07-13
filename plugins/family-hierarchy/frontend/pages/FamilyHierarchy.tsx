import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HierarchyGraph,
  type HierarchyGraphHandle,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';
import { TooltipProvider } from '@allsetlabs/forge/components/ui/tooltip';
import { Loader2, TriangleAlert } from 'lucide-react';
import type { FamilyTree, Person } from '../types';
import { getFamilyTree, putFamilyTree } from '../api';
import {
  computeVisible,
  initialExpanded,
  expandAll,
  collapseAll,
  expandNextLayer,
  generations,
  pathToRoot,
  updatePerson,
  addChild,
  removeSubtree,
} from '../lib/tree';
import { PersonNode } from '../components/PersonNode';
import { LeftPanel } from '../components/LeftPanel';
import { GraphToolbar, type SaveState } from '../components/GraphToolbar';
import { EditPersonModal, type EditSaveData } from '../components/EditPersonModal';

export function FamilyHierarchy() {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [leftView, setLeftView] = useState<'details' | 'uncertain'>('details');
  const [modal, setModal] = useState<{ open: boolean; mode: 'edit' | 'add'; targetId: string | null }>({
    open: false,
    mode: 'edit',
    targetId: null,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const graphRef = useRef<HierarchyGraphHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFamilyTree()
      .then((t) => {
        setTree(t);
        setExpanded(initialExpanded(t.people, t.rootId, 2));
        setSelectedId(t.rootId);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  const persist = useCallback((next: FamilyTree) => {
    setTree(next);
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      putFamilyTree(next)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 600);
  }, []);

  const people = tree?.people ?? {};
  const rootId = tree?.rootId ?? '';

  const visible = useMemo(
    () => (tree ? computeVisible(people, rootId, expanded) : []),
    [tree, people, rootId, expanded]
  );

  const lineage = useMemo(() => {
    if (!hoveredId || !tree) return { set: new Set<string>(), edges: new Set<string>() };
    const path = pathToRoot(people, hoveredId);
    return { set: new Set(path), edges: new Set(path.filter((id) => id !== rootId)) };
  }, [hoveredId, people, rootId, tree]);

  const uncertainList = useMemo(() => Object.values(people).filter((p) => p.uncertain), [people]);

  const revealAndSelect = useCallback(
    (id: string) => {
      if (!tree) return;
      setExpanded((prev) => {
        const next = new Set(prev);
        // expand all ancestors so the node is visible
        for (const a of pathToRoot(people, id).slice(1)) next.add(a);
        return next;
      });
      setSelectedId(id);
      setLeftView('details');
      requestAnimationFrame(() => graphRef.current?.centerOn(id));
    },
    [tree, people]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSaveModal = useCallback(
    (data: EditSaveData) => {
      if (!tree || !modal.targetId) return;
      if (modal.mode === 'edit') {
        const p = people[modal.targetId];
        const patch: Partial<Person> = { name: data.name, translit: data.translit, note: data.note };
        if (p.uncertain && data.markCorrect) {
          patch.uncertain = false;
          patch.uncertainReason = '';
        }
        persist({ ...tree, people: updatePerson(people, modal.targetId, patch) });
      } else {
        const { people: np, id } = addChild(people, modal.targetId, {
          name: data.name,
          translit: data.translit,
          note: data.note,
        });
        persist({ ...tree, people: np });
        setExpanded((prev) => new Set(prev).add(modal.targetId!));
        setSelectedId(id);
      }
      setModal({ open: false, mode: 'edit', targetId: null });
    },
    [tree, modal, people, persist]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!tree || id === rootId) return;
      const parent = people[id].parent;
      persist({ ...tree, people: removeSubtree(people, id) });
      setSelectedId(parent ?? rootId);
    },
    [tree, people, rootId, persist]
  );

  if (loadError) {
    return (
      <div className="dark flex h-full items-center justify-center bg-background text-foreground">
        <div className="flex max-w-md flex-col items-center gap-2 text-center">
          <TriangleAlert className="h-8 w-8 text-destructive" />
          <div className="font-semibold">Could not load the family hierarchy</div>
          <div className="text-sm text-muted-foreground">{loadError}</div>
        </div>
      </div>
    );
  }
  if (!tree) {
    return (
      <div className="dark flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selected = selectedId ? people[selectedId] ?? null : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="dark flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
        <div className="flex min-h-0 flex-1">
          <LeftPanel
          tree={tree}
          selected={selected}
          view={leftView}
          editMode={editMode}
          peopleCount={Object.keys(people).length}
          generationCount={generations(people, rootId)}
          uncertainList={uncertainList}
          onSetView={setLeftView}
          onSelectPerson={revealAndSelect}
          onEditSelected={() =>
            selectedId && setModal({ open: true, mode: 'edit', targetId: selectedId })
          }
        />

        <div className="relative min-w-0 flex-1">
          {/* space-y backdrop */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]" />

          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <GraphToolbar
              editMode={editMode}
              saveState={saveState}
              onToggleEdit={() => setEditMode((v) => !v)}
              onExpandAll={() => setExpanded(expandAll(people))}
              onCollapseAll={() => setExpanded(collapseAll(rootId))}
              onExpandLayer={() => setExpanded((prev) => expandNextLayer(people, rootId, prev))}
              onFit={() => graphRef.current?.fit()}
              onZoomIn={() => graphRef.current?.zoomIn()}
              onZoomOut={() => graphRef.current?.zoomOut()}
            />
          </div>

          {editMode && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-primary/40 bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              Edit mode — select a person to add a child, rename, or delete
            </div>
          )}

          <HierarchyGraph
            ref={graphRef}
            nodes={visible}
            activeEdgeChildIds={lineage.edges}
            onBackgroundClick={() => setSelectedId(null)}
            nodeWidth={176}
            nodeHeight={64}
            renderNode={(id) => {
              const p = people[id];
              if (!p) return null;
              return (
                <PersonNode
                  person={p}
                  isRoot={id === rootId}
                  selected={selectedId === id}
                  hoverActive={hoveredId !== null}
                  inLineage={lineage.set.has(id)}
                  expanded={expanded.has(id)}
                  editMode={editMode}
                  onSelect={() => {
                    setSelectedId(id);
                    setLeftView('details');
                  }}
                  onToggle={() => toggleExpand(id)}
                  onHover={(on) => setHoveredId(on ? id : null)}
                  onEdit={() => setModal({ open: true, mode: 'edit', targetId: id })}
                  onAdd={() => setModal({ open: true, mode: 'add', targetId: id })}
                  onDelete={() => handleDelete(id)}
                />
              );
            }}
          />
          </div>
        </div>

        <EditPersonModal
          open={modal.open}
          mode={modal.mode}
          person={modal.targetId ? people[modal.targetId] : null}
          onClose={() => setModal({ open: false, mode: 'edit', targetId: null })}
          onSave={handleSaveModal}
        />
      </div>
    </TooltipProvider>
  );
}
