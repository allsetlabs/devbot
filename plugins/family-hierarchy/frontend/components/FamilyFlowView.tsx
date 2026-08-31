import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  useViewport,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
} from '@allsetlabs/forge/components/ui/flow-graph';
import {
  computeHierarchyLayout,
  type HierarchyDirection,
  type HierarchyAlgorithm,
  type HierarchyLayoutResult,
} from '@allsetlabs/forge/components/ui/hierarchy-graph';
import { cn } from '@allsetlabs/forge/lib/utils';
import type { Person } from '../types';
import type { Language, ConnectorStyle } from '../lib/useGraphSettings';
import type { VisibleNode } from '../lib/tree';
import {
  PersonFlowViewNode,
  VIEW_NODE_WIDTH,
  VIEW_NODE_HEIGHT,
  type PersonViewNodeData,
} from './PersonFlowViewNode';

const nodeTypes = { person: PersonFlowViewNode };
const BASE_EDGE = { stroke: 'oklch(var(--muted-foreground) / 0.45)', strokeWidth: 1.5 };
const ACTIVE_EDGE = { stroke: 'oklch(var(--primary))', strokeWidth: 2 };

export interface FamilyFlowViewHandle {
  fit: () => void;
  relayout: () => void;
}

interface Props {
  people: Record<string, Person>;
  rootId: string;
  visible: VisibleNode[];
  expanded: Set<string>;
  language: Language;
  direction: HierarchyDirection;
  algorithm: HierarchyAlgorithm;
  connector: ConnectorStyle;
  hGap: number;
  vGap: number;
  centerOnSelect: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  selectedAncestors: Set<string>;
  hoverNeighbors: Set<string>;
  activeEdges: Set<string>; // child ids whose edge-to-parent is highlighted
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onBackgroundClick: () => void;
}

/**
 * Read-only ReactFlow rendering of the visible tree — the opt-in alternative to the tuned
 * HierarchyGraph, driven by the page's expand/collapse state (`visible` + `expanded`). Positions
 * come from forge's shared `computeHierarchyLayout`, so algorithm / direction / gaps match the
 * HierarchyGraph exactly, and its `levels` drive the same generation bands + numbered rail. Layout
 * is async (the 'elk' algorithm lazy-loads elkjs), so it's held in state and re-applied when ready.
 */
export const FamilyFlowView = forwardRef<FamilyFlowViewHandle, Props>(function FamilyFlowView(props, ref) {
  return (
    <ReactFlowProvider>
      <FamilyFlowViewInner {...props} innerRef={ref} />
    </ReactFlowProvider>
  );
});

function FamilyFlowViewInner({
  people,
  rootId,
  visible,
  expanded,
  language,
  direction,
  algorithm,
  connector,
  hGap,
  vGap,
  centerOnSelect,
  selectedId,
  hoveredId,
  selectedAncestors,
  hoverNeighbors,
  activeEdges,
  onSelect,
  onToggle,
  onHover,
  onBackgroundClick,
  innerRef,
}: Props & { innerRef: React.Ref<FamilyFlowViewHandle> }) {
  const instRef = useRef<ReactFlowInstance | null>(null);
  const [relayoutNonce, setRelayoutNonce] = useState(0);

  useImperativeHandle(
    innerRef,
    () => ({
      fit: () => instRef.current?.fitView({ duration: 300, padding: 0.2 }),
      relayout: () => setRelayoutNonce((n) => n + 1),
    }),
    []
  );

  // ---- layout (async; forge's shared engine) ----
  const [layout, setLayout] = useState<HierarchyLayoutResult | null>(null);
  const layoutToken = useRef(0);
  useEffect(() => {
    const token = ++layoutToken.current;
    const nodesForLayout = visible.map((v) => ({ id: v.id, parentId: v.parentId }));
    computeHierarchyLayout(nodesForLayout, {
      nodeWidth: VIEW_NODE_WIDTH,
      nodeHeight: VIEW_NODE_HEIGHT,
      hGap,
      vGap,
      direction,
      algorithm,
    })
      .then((res) => {
        if (token === layoutToken.current) setLayout(res);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, hGap, vGap, direction, algorithm, relayoutNonce]);

  const isVertical = layout?.isVertical ?? direction !== 'right';

  const makeData = useCallback(
    (id: string): PersonViewNodeData => ({
      person: people[id],
      language,
      isRoot: id === rootId,
      selected: selectedId === id,
      hovered: hoveredId === id,
      neighbor: hoverNeighbors.has(id),
      inSelectedPath: selectedAncestors.has(id),
      expanded: expanded.has(id),
      direction: isVertical ? 'down' : 'right',
      onSelect: () => onSelect(id),
      onToggle: () => onToggle(id),
      onHover: (on: boolean) => onHover(on ? id : null),
    }),
    [
      people,
      language,
      rootId,
      selectedId,
      hoveredId,
      hoverNeighbors,
      selectedAncestors,
      expanded,
      isVertical,
      onSelect,
      onToggle,
      onHover,
    ]
  );

  const [nodes, setNodes] = useState<Node[]>([]);
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  // Refit after the *next* layout applies whenever the structure or orientation/algorithm changes —
  // set here, consumed once inside the node-sync effect (which runs after positions are in place).
  const sig = useMemo(() => visible.map((v) => v.id).join(','), [visible]);
  const fitPending = useRef(true);
  useEffect(() => {
    fitPending.current = true;
  }, [sig, direction, algorithm, relayoutNonce]);

  // Re-seed nodes from the visible set + layout positions on every layout/highlight change,
  // preserving each surviving node's measured size while always resetting its position.
  useEffect(() => {
    if (!layout) return;
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return visible.map((v) => {
        const p = layout.pos.get(v.id) ?? { x: 0, y: 0 };
        const existing = byId.get(v.id);
        return {
          ...(existing ?? { id: v.id, type: 'person' }),
          id: v.id,
          type: 'person',
          position: { x: p.x, y: p.y },
          draggable: false,
          data: makeData(v.id),
        } as Node;
      });
    });
    if (fitPending.current) {
      fitPending.current = false;
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => instRef.current?.fitView({ duration: 300, padding: 0.2 }));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
  }, [layout, visible, makeData]);

  // Center on the selected node (keeping the current zoom) when the option is on.
  useEffect(() => {
    if (!centerOnSelect || !selectedId || !layout) return;
    const p = layout.pos.get(selectedId);
    const inst = instRef.current;
    if (!p || !inst) return;
    const raf = requestAnimationFrame(() =>
      inst.setCenter(p.x + VIEW_NODE_WIDTH / 2, p.y + VIEW_NODE_HEIGHT / 2, { zoom: inst.getZoom(), duration: 400 })
    );
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, centerOnSelect]);

  const edgeType = connector === 'smooth' ? 'default' : 'smoothstep';
  const edges = useMemo<Edge[]>(() => {
    const visibleIds = new Set(visible.map((v) => v.id));
    const out: Edge[] = [];
    for (const v of visible) {
      if (v.parentId && visibleIds.has(v.parentId)) {
        const active = activeEdges.has(v.id);
        out.push({
          id: `${v.parentId}->${v.id}`,
          source: v.parentId,
          target: v.id,
          type: edgeType,
          style: active ? ACTIVE_EDGE : BASE_EDGE,
        });
      }
    }
    return out;
  }, [visible, activeEdges, edgeType]);

  return (
    <div className="relative h-full w-full">
      {/* generation bands sit behind the (transparent) ReactFlow canvas */}
      <GenerationBands levels={layout?.levels} isVertical={isVertical} alongGap={layout?.alongGap ?? 0} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={onBackgroundClick}
        onInit={(inst) => {
          instRef.current = inst;
          inst.fitView({ padding: 0.2 });
        }}
        colorMode="dark"
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        selectNodesOnDrag={false}
        deleteKeyCode={null}
        minZoom={0.02}
        proOptions={{ hideAttribution: true }}
        className="!absolute inset-0 z-[1] bg-transparent"
      >
        <GenerationRail levels={layout?.levels} isVertical={isVertical} axisLabel="GENERATIONS" />
        <Controls showInteractive={false} className="!shadow-lg" />
      </ReactFlow>
    </div>
  );
}

/** Alternating shaded stripe per generation, positioned in screen space from the live viewport. */
function GenerationBands({
  levels,
  isVertical,
  alongGap,
  bandParity = 1,
}: {
  levels: HierarchyLayoutResult['levels'] | undefined;
  isVertical: boolean;
  alongGap: number;
  bandParity?: 0 | 1;
}) {
  const { x, y, zoom } = useViewport();
  if (!levels?.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {levels.map((lv, d) => {
        if (d % 2 !== bandParity) return null;
        const start = lv.along - alongGap / 2;
        const size = lv.size + alongGap;
        return isVertical ? (
          <div
            key={d}
            className="absolute left-0 right-0 bg-foreground/[0.05]"
            style={{ top: y + start * zoom, height: size * zoom }}
          />
        ) : (
          <div
            key={d}
            className="absolute bottom-0 top-0 bg-foreground/[0.05]"
            style={{ left: x + start * zoom, width: size * zoom }}
          />
        );
      })}
    </div>
  );
}

/** The gradient rail with the vertical axis caption + a numbered circle per generation. */
function GenerationRail({
  levels,
  isVertical,
  axisLabel,
}: {
  levels: HierarchyLayoutResult['levels'] | undefined;
  isVertical: boolean;
  axisLabel: React.ReactNode;
}) {
  const { x, y, zoom } = useViewport();
  if (!levels?.length) return null;
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-10',
        isVertical
          ? 'inset-y-0 left-0 w-20 bg-gradient-to-r from-background via-background/85 to-transparent'
          : 'inset-x-0 top-0 h-20 bg-gradient-to-b from-background via-background/85 to-transparent'
      )}
    >
      {axisLabel != null &&
        (isVertical ? (
          <div
            className="absolute top-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground/60"
            style={{ left: 9, transform: 'translate(-50%, -50%) rotate(-90deg)' }}
          >
            {axisLabel}
          </div>
        ) : (
          <div className="absolute left-3 top-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
            {axisLabel}
          </div>
        ))}
      {levels.map((lv, d) => {
        const alongCenter = lv.along + lv.size / 2;
        return isVertical ? (
          <div
            key={d}
            className="absolute flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/85 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur"
            style={{ left: 26, top: y + alongCenter * zoom }}
          >
            {d + 1}
          </div>
        ) : (
          <div
            key={d}
            className="absolute flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card/85 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur"
            style={{ top: 32, left: x + alongCenter * zoom }}
          >
            {d + 1}
          </div>
        );
      })}
    </div>
  );
}
