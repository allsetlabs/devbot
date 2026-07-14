import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HierarchyGraph,
  type HierarchyGraphHandle,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';
import { TooltipProvider } from '@allsetlabs/forge/components/ui/tooltip';
import { Loader2, TriangleAlert } from 'lucide-react';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import type { FamilyTree, Person } from '../types';
import { getFamilyTree, putFamilyTree } from '../api';
import {
  computeVisible,
  initialExpanded,
  expandLineageByNames,
  expandAll,
  collapseAll,
  expandNextLayer,
  generations,
  pathToRoot,
  updatePerson,
  addChild,
  removeSubtree,
} from '../lib/tree';
import { measurePersonNodeWidth, NODE_MAX_WIDTH } from '../lib/measure';
import { useGraphSettings } from '../lib/useGraphSettings';
import { PersonNode } from '../components/PersonNode';
import { DetailPanel } from '../components/DetailPanel';
import { InfoModal } from '../components/InfoModal';
import { GraphDevPanel } from '../components/GraphDevPanel';
import { GraphToolbar, type SaveState } from '../components/GraphToolbar';
import { EditPersonModal, type EditSaveData } from '../components/EditPersonModal';

// Default view: minimize everything except this 6-generation spine.
const DEFAULT_SPINE = ['சாத்தப்பன்', 'வெள்ளையன்', 'வீரப்பன்', 'நாகப்பன்'];

export function FamilyHierarchy() {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; mode: 'edit' | 'add'; targetId: string | null }>({
    open: false,
    mode: 'edit',
    targetId: null,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const graphRef = useRef<HierarchyGraphHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { settings, update: updateSettings, reset: resetSettings } = useGraphSettings();

  useEffect(() => {
    getFamilyTree()
      .then((t) => {
        setTree(t);
        const spine = expandLineageByNames(t.people, t.rootId, DEFAULT_SPINE);
        setExpanded(spine.size > 1 ? spine : initialExpanded(t.people, t.rootId, 2));
        // no node selected initially — the detail panel appears only when the user clicks a node
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

  // The selected node's lineage drives the highlighted spine: ancestor borders + edge lines.
  const selectedPath = useMemo(() => {
    if (!selectedId || !tree) return { ancestors: new Set<string>(), edges: new Set<string>() };
    const path = pathToRoot(people, selectedId); // [selected, …, root]
    return { ancestors: new Set(path.slice(1)), edges: new Set(path.filter((id) => id !== rootId)) };
  }, [selectedId, people, rootId, tree]);

  // Hovering a node highlights its immediate neighbourhood — parent + children + their connectors.
  const hover = useMemo(() => {
    const neighbors = new Set<string>();
    const edges = new Set<string>();
    const p = hoveredId ? people[hoveredId] : null;
    if (p) {
      if (p.parent) {
        neighbors.add(p.parent);
        edges.add(hoveredId!); // edge hovered→parent is keyed by the child (hovered) id
      }
      for (const c of p.children) {
        neighbors.add(c);
        edges.add(c); // edge hovered→child is keyed by the child id
      }
    }
    return { neighbors, edges };
  }, [hoveredId, people]);

  const activeEdges = useMemo(
    () => new Set<string>([...selectedPath.edges, ...hover.edges]),
    [selectedPath, hover]
  );

  // Root→selected order; feeds the graph's focus layout so the lineage straightens & centers.
  const focusPath = useMemo(
    () => (selectedId && tree ? [...pathToRoot(people, selectedId)].reverse() : undefined),
    [selectedId, people, tree]
  );

  const nodeWidthOf = useCallback(
    (id: string) => {
      // horizontal layout reads best with uniform columns → fix every node to the max width
      if (settings.direction === 'right') return NODE_MAX_WIDTH;
      const p = people[id];
      if (!p) return 120;
      return measurePersonNodeWidth(p.name, p.translit, p.marker === 'A' || p.marker === 'M');
    },
    [people, settings.direction]
  );

  const uncertainList = useMemo(() => Object.values(people).filter((p) => p.uncertain), [people]);

  // Re-center on the selected node after the focus layout reflows around its lineage.
  useEffect(() => {
    if (!selectedId || !settings.centerOnSelect) return;
    const raf = requestAnimationFrame(() => graphRef.current?.centerOn(selectedId));
    return () => cancelAnimationFrame(raf);
  }, [selectedId, settings.centerOnSelect]);

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
      setInfoOpen(false);
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
      {/* graph controls live in the shared app header */}
      <HeaderSlot>
        <GraphToolbar
          editMode={editMode}
          saveState={saveState}
          onToggleEdit={() => setEditMode((v) => !v)}
          onExpandAll={() => setExpanded(expandAll(people))}
          onCollapseAll={() => setExpanded(collapseAll(rootId))}
          onExpandLayer={() => setExpanded((prev) => expandNextLayer(people, rootId, prev))}
          onFit={() => graphRef.current?.fit()}
          onInfo={() => setInfoOpen(true)}
        />
      </HeaderSlot>

      <div className="dark flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* backdrop glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]" />

          {editMode && (
            <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-primary/40 bg-card/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              Edit mode — select a person to add a child, rename, or delete
            </div>
          )}

          <HierarchyGraph
            ref={graphRef}
            nodes={visible}
            activeEdgeChildIds={activeEdges}
            focusPath={settings.centerOnSelect ? focusPath : undefined}
            onBackgroundClick={() => setSelectedId(null)}
            nodeWidth={nodeWidthOf}
            nodeHeight={54}
            hGap={settings.treeWidth}
            vGap={settings.treeHeight}
            direction={settings.direction}
            algorithm={settings.algorithm}
            zoomable={false}
            edgeStyle={settings.connector}
            showGenerationBands
            generationAxisLabel="GENERATIONS"
            renderNode={(id) => {
              const p = people[id];
              if (!p) return null;
              return (
                <PersonNode
                  person={p}
                  isRoot={id === rootId}
                  selected={selectedId === id}
                  hovered={hoveredId === id}
                  neighbor={hover.neighbors.has(id)}
                  inSelectedPath={selectedPath.ancestors.has(id)}
                  expanded={expanded.has(id)}
                  editMode={editMode}
                  onSelect={() => setSelectedId(id)}
                  onToggle={() => toggleExpand(id)}
                  onHover={(on) => setHoveredId(on ? id : null)}
                  onEdit={() => setModal({ open: true, mode: 'edit', targetId: id })}
                  onAdd={() => setModal({ open: true, mode: 'add', targetId: id })}
                  onDelete={() => handleDelete(id)}
                />
              );
            }}
          />

          {/* right-side detail panel — only when a node is selected */}
          {selected && (
            <div className="absolute bottom-4 right-4 top-4 z-20 w-[300px] max-w-[calc(100%-2rem)]">
              <DetailPanel
                people={people}
                selected={selected}
                editMode={editMode}
                onClose={() => setSelectedId(null)}
                onSelectPerson={revealAndSelect}
                onHoverPerson={setHoveredId}
                onEditSelected={() =>
                  selectedId && setModal({ open: true, mode: 'edit', targetId: selectedId })
                }
              />
            </div>
          )}

          {/* TEMPORARY: live layout tuning (remove once width/height gaps are confirmed) */}
          <GraphDevPanel
            settings={settings}
            onChange={updateSettings}
            onReset={resetSettings}
            onRelayout={() => graphRef.current?.relayout()}
          />
        </div>

        <InfoModal
          open={infoOpen}
          tree={tree}
          peopleCount={Object.keys(people).length}
          generationCount={generations(people, rootId)}
          uncertainList={uncertainList}
          onClose={() => setInfoOpen(false)}
          onSelectPerson={revealAndSelect}
        />

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
