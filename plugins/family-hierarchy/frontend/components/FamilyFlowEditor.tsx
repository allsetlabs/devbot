import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  applyNodeChanges,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type ReactFlowInstance,
} from '@allsetlabs/forge/components/ui/flow-graph';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import type { Person } from '../types';
import { canConnect, computeFlowPositions, type XY } from '../lib/tree';
import { PersonFlowNode, DRAG_HANDLE_CLASS, type PersonNodeData } from './PersonFlowNode';

const nodeTypes = { person: PersonFlowNode };
const LAYOUT = { nodeW: 190, nodeH: 96, hGap: 44, vGap: 72 };
const EDGE_STYLE = { stroke: 'oklch(var(--primary))', strokeWidth: 2 };

interface Props {
  people: Record<string, Person>;
  rootId: string;
  onConnectNodes: (parentId: string, childId: string) => void;
  onDisconnect: (childId: string) => void;
  onChangeName: (id: string, v: string) => void;
  onChangeTranslit: (id: string, v: string) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: () => string | null; // returns the new node's id (or null)
}

/**
 * ReactFlow-based structural editor. `people` (lifted to the page) is the single source of truth for
 * structure — connect / disconnect / rename / delete flow back through the callbacks. Node objects,
 * however, are held in ReactFlow-controlled state so that `applyNodeChanges` records each node's
 * *measured size* (without which ReactFlow keeps nodes `visibility:hidden` and their inputs
 * unfocusable) and its dragged position. We seed positions from a tidy layout and never persist them.
 */
export function FamilyFlowEditor({
  people,
  rootId,
  onConnectNodes,
  onDisconnect,
  onChangeName,
  onChangeTranslit,
  onDeleteNode,
  onAddNode,
}: Props) {
  const instRef = useRef<ReactFlowInstance | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingPos = useRef<Map<string, XY>>(new Map()); // positions for nodes added mid-edit

  const makeData = useCallback(
    (p: Person): PersonNodeData => ({
      person: p,
      isRoot: p.id === rootId,
      onChangeName,
      onChangeTranslit,
      onDelete: onDeleteNode,
    }),
    [rootId, onChangeName, onChangeTranslit, onDeleteNode]
  );

  const [nodes, setNodes] = useState<Node[]>(() => {
    const pos = computeFlowPositions(people, LAYOUT);
    return Object.values(people).map((p) => ({
      id: p.id,
      type: 'person',
      position: pos.get(p.id) ?? { x: 0, y: 0 },
      dragHandle: `.${DRAG_HANDLE_CLASS}`,
      data: makeData(p),
    }));
  });

  // Apply every ReactFlow change (dimensions/measure, drag position, selection) so nodes measure &
  // stay draggable — the missing piece that otherwise leaves them hidden and unclickable.
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  // Sync the node set + data to `people` on every structural/text change, preserving each surviving
  // node's measured size and current (possibly dragged) position.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return Object.values(people).map((p) => {
        const existing = byId.get(p.id);
        if (existing) return { ...existing, data: makeData(p) };
        const pos = pendingPos.current.get(p.id) ?? { x: 0, y: 0 };
        pendingPos.current.delete(p.id);
        return { id: p.id, type: 'person', position: pos, dragHandle: `.${DRAG_HANDLE_CLASS}`, data: makeData(p) };
      });
    });
  }, [people, makeData]);

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    for (const p of Object.values(people)) {
      if (p.parent && people[p.parent]) {
        out.push({ id: `${p.parent}->${p.id}`, source: p.parent, target: p.id, style: EDGE_STYLE });
      }
    }
    return out;
  }, [people]);

  const isValidConnection = useCallback(
    (c: Connection | Edge) => !!c.source && !!c.target && canConnect(people, rootId, c.source, c.target),
    [people, rootId]
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && canConnect(people, rootId, c.source, c.target)) {
        onConnectNodes(c.source, c.target); // source handle = parent, target handle = child
      }
    },
    [people, rootId, onConnectNodes]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => onDisconnect(edge.target), // click a connector to remove it
    [onDisconnect]
  );

  const addNode = useCallback(() => {
    const id = onAddNode();
    if (!id) return;
    const inst = instRef.current;
    const rect = wrapRef.current?.getBoundingClientRect();
    const pos =
      inst && rect
        ? inst.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 })
        : { x: 0, y: 0 };
    pendingPos.current.set(id, pos); // the [people] sync effect will place & mount it
  }, [onAddNode]);

  const tidy = useCallback(() => {
    const pos = computeFlowPositions(people, LAYOUT);
    setNodes((prev) => prev.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })));
    requestAnimationFrame(() => instRef.current?.fitView({ duration: 300, padding: 0.2 }));
  }, [people]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        isValidConnection={isValidConnection}
        onInit={(inst) => {
          instRef.current = inst;
          inst.fitView({ padding: 0.2 });
        }}
        colorMode="dark"
        fitView
        deleteKeyCode={null}
        connectionRadius={44}
        defaultEdgeOptions={{ style: EDGE_STYLE }}
        connectionLineStyle={EDGE_STYLE}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="oklch(var(--muted-foreground) / 0.3)" />
        <Controls showInteractive={false} className="!shadow-lg" />
        <Panel position="top-left" className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={addNode}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add node
          </Button>
          <Button size="sm" variant="ghost" onClick={tidy}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Tidy layout
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
