import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HierarchyGraph,
  type HierarchyGraphHandle,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';
import { TooltipProvider } from '@allsetlabs/forge/components/ui/tooltip';
import { Loader2, TriangleAlert } from 'lucide-react';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import type { FamilyTree } from '../types';
import { getFamilyTree, putFamilyTree } from '../api';
import {
  computeVisible,
  initialExpanded,
  expandLineageByNames,
  expandAll,
  collapseAll,
  generations,
  pathToRoot,
  updatePerson,
  removeSubtree,
  reparent,
  canConnect,
  addNode,
} from '../lib/tree';
import { measurePersonNodeWidth, NODE_MAX_WIDTH } from '../lib/measure';
import { useGraphSettings } from '../lib/useGraphSettings';
import { PersonNode } from '../components/PersonNode';
import { DetailPanel } from '../components/DetailPanel';
import { InfoModal } from '../components/InfoModal';
import { LayoutPanel } from '../components/LayoutPanel';
import { GraphToolbar } from '../components/GraphToolbar';
import { FamilyFlowEditor } from '../components/FamilyFlowEditor';
import { FamilyFlowView, type FamilyFlowViewHandle } from '../components/FamilyFlowView';

// Default view: minimize everything except this 6-generation spine.
const DEFAULT_SPINE = ['சாத்தப்பன்', 'வெள்ளையன்', 'வீரப்பன்', 'நாகப்பன்'];

export function FamilyHierarchy() {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<FamilyTree | null>(null); // tree at edit-entry, for Cancel
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);

  const graphRef = useRef<HierarchyGraphHandle>(null);
  const flowViewRef = useRef<FamilyFlowViewHandle>(null);
  const { settings, update: updateSettings, reset: resetSettings } = useGraphSettings();
  const flowView = settings.renderer === 'flow';

  useEffect(() => {
    getFamilyTree()
      .then((t) => {
        setTree(t);
        const spine = expandLineageByNames(t.people, t.rootId, DEFAULT_SPINE);
        setExpanded(spine.size > 1 ? spine : initialExpanded(t.people, t.rootId, 2));
      })
      .catch((e) => setLoadError(String(e)));
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

  // Hovering a node highlights its direct children AND its whole ancestor chain up to the root,
  // with every connector along that path.
  const hover = useMemo(() => {
    const neighbors = new Set<string>();
    const edges = new Set<string>();
    const p = hoveredId ? people[hoveredId] : null;
    if (p) {
      for (const c of p.children) {
        neighbors.add(c);
        edges.add(c); // edge hovered→child is keyed by the child id
      }
      const path = pathToRoot(people, p.id); // [hovered, parent, …, root]
      for (const id of path.slice(1)) neighbors.add(id); // ancestors (not the hovered node itself)
      for (const id of path) if (id !== rootId) edges.add(id); // each node's edge to its parent
    }
    return { neighbors, edges };
  }, [hoveredId, people, rootId]);

  const activeEdges = useMemo(
    () => new Set<string>([...selectedPath.edges, ...hover.edges]),
    [selectedPath, hover]
  );

  const focusPath = useMemo(
    () => (selectedId && tree ? [...pathToRoot(people, selectedId)].reverse() : undefined),
    [selectedId, people, tree]
  );

  const nodeWidthOf = useCallback(
    (id: string) => {
      if (settings.direction === 'right') return NODE_MAX_WIDTH; // uniform columns read best horizontally
      const p = people[id];
      if (!p) return 120;
      // Nodes show one name now, so measure just the active language's text.
      const text = settings.language === 'ta' ? p.name : p.translit;
      return measurePersonNodeWidth(text, '', p.marker === 'A' || p.marker === 'M');
    },
    [people, settings.direction, settings.language]
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
        for (const a of pathToRoot(people, id).slice(1)) next.add(a); // expand ancestors so it's visible
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

  // ---- edit mode: enter / save-all / cancel ----

  const enterEdit = useCallback(() => {
    setEditSnapshot(tree);
    setEditMode(true);
    setSelectedId(null);
    setInfoOpen(false);
    setLayoutOpen(false);
    setSaveError(null);
  }, [tree]);

  const cancelEdit = useCallback(() => {
    if (editSnapshot) setTree(editSnapshot); // discard every staged change
    setEditSnapshot(null);
    setEditMode(false);
    setSaveError(null);
  }, [editSnapshot]);

  const saveEdit = useCallback(() => {
    if (!tree) return;
    setSaving(true);
    setSaveError(null);
    putFamilyTree(tree)
      .then(() => {
        setEditSnapshot(null);
        setEditMode(false);
      })
      .catch((e) => setSaveError(String(e)))
      .finally(() => setSaving(false));
  }, [tree]);

  // ---- edit mode: structural mutations (staged locally; committed on Save) ----

  const onChangeName = useCallback((id: string, name: string) => {
    setTree((t) => (t ? { ...t, people: updatePerson(t.people, id, { name }) } : t));
  }, []);

  const onChangeTranslit = useCallback((id: string, translit: string) => {
    setTree((t) => (t ? { ...t, people: updatePerson(t.people, id, { translit }) } : t));
  }, []);

  const onConnectNodes = useCallback((parentId: string, childId: string) => {
    setTree((t) =>
      t && canConnect(t.people, t.rootId, parentId, childId)
        ? { ...t, people: reparent(t.people, childId, parentId) }
        : t
    );
  }, []);

  const onDisconnect = useCallback((childId: string) => {
    setTree((t) => (t && childId !== t.rootId ? { ...t, people: reparent(t.people, childId, null) } : t));
  }, []);

  const onDeleteNode = useCallback((id: string) => {
    setTree((t) => (t && id !== t.rootId ? { ...t, people: removeSubtree(t.people, id) } : t));
  }, []);

  const onAddNode = useCallback((): string | null => {
    if (!tree) return null;
    const { people: np, id } = addNode(tree.people);
    setTree({ ...tree, people: np });
    return id;
  }, [tree]);

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
          saving={saving}
          layoutOpen={layoutOpen}
          language={settings.language}
          onEnterEdit={enterEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onExpandAll={() => setExpanded(expandAll(people))}
          onCollapseAll={() => setExpanded(collapseAll(rootId))}
          onFit={() => (flowView ? flowViewRef.current?.fit() : graphRef.current?.fit())}
          onToggleLayout={() => setLayoutOpen((v) => !v)}
          onToggleLanguage={() => updateSettings('language', settings.language === 'ta' ? 'en' : 'ta')}
          onInfo={() => setInfoOpen(true)}
        />
      </HeaderSlot>

      <div className="dark flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {editMode ? (
            <>
              <FamilyFlowEditor
                people={people}
                rootId={rootId}
                onConnectNodes={onConnectNodes}
                onDisconnect={onDisconnect}
                onChangeName={onChangeName}
                onChangeTranslit={onChangeTranslit}
                onDeleteNode={onDeleteNode}
                onAddNode={onAddNode}
              />
              {saveError && (
                <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-destructive/50 bg-card/90 px-3 py-1 text-xs text-destructive backdrop-blur">
                  Save failed — {saveError}
                </div>
              )}
            </>
          ) : (
            <>
              {/* backdrop glow */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.12),transparent_60%)]" />

              {flowView ? (
                <FamilyFlowView
                  ref={flowViewRef}
                  people={people}
                  rootId={rootId}
                  visible={visible}
                  expanded={expanded}
                  language={settings.language}
                  direction={settings.direction}
                  algorithm={settings.algorithm}
                  connector={settings.connector}
                  hGap={settings.treeWidth}
                  vGap={settings.treeHeight}
                  centerOnSelect={settings.centerOnSelect}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  selectedAncestors={selectedPath.ancestors}
                  hoverNeighbors={hover.neighbors}
                  activeEdges={activeEdges}
                  onSelect={setSelectedId}
                  onToggle={toggleExpand}
                  onHover={setHoveredId}
                  onBackgroundClick={() => setSelectedId(null)}
                />
              ) : (
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
                        language={settings.language}
                        selected={selectedId === id}
                        hovered={hoveredId === id}
                        neighbor={hover.neighbors.has(id)}
                        inSelectedPath={selectedPath.ancestors.has(id)}
                        expanded={expanded.has(id)}
                        onSelect={() => setSelectedId(id)}
                        onToggle={() => toggleExpand(id)}
                        onHover={(on) => setHoveredId(on ? id : null)}
                      />
                    );
                  }}
                />
              )}

              {/* right-side detail panel — only when a node is selected */}
              {selected && (
                <div className="absolute bottom-4 right-4 top-4 z-20 w-[300px] max-w-[calc(100%-2rem)]">
                  <DetailPanel
                    people={people}
                    selected={selected}
                    onClose={() => setSelectedId(null)}
                    onSelectPerson={revealAndSelect}
                    onHoverPerson={setHoveredId}
                  />
                </div>
              )}

              {layoutOpen && (
                <LayoutPanel
                  settings={settings}
                  onChange={updateSettings}
                  onReset={resetSettings}
                  onRelayout={() => (flowView ? flowViewRef.current?.relayout() : graphRef.current?.relayout())}
                  onClose={() => setLayoutOpen(false)}
                />
              )}
            </>
          )}
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
      </div>
    </TooltipProvider>
  );
}
