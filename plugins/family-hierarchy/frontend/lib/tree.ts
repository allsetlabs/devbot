import type { Person } from '../types';

export type People = Record<string, Person>;
export interface VisibleNode {
  id: string;
  parentId: string | null;
}

/** ids from `id` up to (and including) the root. */
export function pathToRoot(people: People, id: string): string[] {
  const out: string[] = [];
  let cur: string | null = id;
  const seen = new Set<string>();
  while (cur && people[cur] && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    cur = people[cur].parent;
  }
  return out;
}

export function descendantIds(people: People, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(people[id]?.children ?? [])];
  while (stack.length) {
    const c = stack.pop()!;
    if (out.has(c)) continue;
    out.add(c);
    stack.push(...(people[c]?.children ?? []));
  }
  return out;
}

/** BFS from root; a node's children are included only when the node is expanded. */
export function computeVisible(people: People, rootId: string, expanded: Set<string>): VisibleNode[] {
  const out: VisibleNode[] = [];
  const queue: string[] = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    const p = people[id];
    if (!p) continue;
    out.push({ id, parentId: p.parent });
    if (expanded.has(id)) queue.push(...p.children);
  }
  return out;
}

export interface XY {
  x: number;
  y: number;
}

/**
 * A simple post-order "tidy" layout used to seed the flow editor's node positions: leaves are laid
 * out left→right, each parent is centered over its children, generations stack down the y axis.
 * The editor lets the user drag freely from here, so this only needs to be a sensible starting frame.
 */
export function computeFlowPositions(
  people: People,
  opts: { nodeW: number; nodeH: number; hGap: number; vGap: number }
): Map<string, XY> {
  const { nodeW, nodeH, hGap, vGap } = opts;
  const pos = new Map<string, XY>();
  const seen = new Set<string>();
  let cursor = 0;
  const place = (id: string, depth: number): number => {
    if (seen.has(id)) return pos.get(id)?.x ?? 0;
    seen.add(id);
    const kids = people[id]?.children ?? [];
    let x: number;
    if (kids.length === 0) {
      x = cursor * (nodeW + hGap);
      cursor += 1;
    } else {
      const xs = kids.map((k) => place(k, depth + 1));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(id, { x, y: depth * (nodeH + vGap) });
    return x;
  };
  for (const p of Object.values(people)) {
    if (!p.parent || !people[p.parent]) place(p.id, 0); // every root of the forest
  }
  return pos;
}

/** Default view: expand the branch that book `page` documents (its lineage to the root). */
export function initialExpanded(people: People, rootId: string, page = 2): Set<string> {
  const exp = new Set<string>([rootId]);
  for (const p of Object.values(people)) {
    if (p.sourcePages?.includes(page)) {
      for (const id of pathToRoot(people, p.id)) exp.add(id);
    }
  }
  return exp;
}

/**
 * Expand only the single lineage that walks down through children matching `names`
 * (starting below the root). Every node on that path is expanded, so its siblings show
 * (collapsed) at each level while the rest of the tree stays minimized.
 */
export function expandLineageByNames(people: People, rootId: string, names: string[]): Set<string> {
  const expanded = new Set<string>([rootId]);
  let cur = rootId;
  for (const name of names) {
    const next = people[cur]?.children.find((c) => people[c]?.name === name);
    if (!next) break;
    expanded.add(next);
    cur = next;
  }
  return expanded;
}

export function expandAll(people: People): Set<string> {
  return new Set(Object.keys(people).filter((id) => people[id].children.length > 0));
}

export function collapseAll(rootId: string): Set<string> {
  return new Set([rootId]);
}

export function newId(people: People): string {
  let i = 1;
  while (people[`c${i}`]) i += 1;
  return `c${i}`;
}

export function generations(people: People, rootId: string): number {
  let max = 0;
  const walk = (id: string, d: number) => {
    max = Math.max(max, d);
    for (const c of people[id]?.children ?? []) walk(c, d + 1);
  };
  walk(rootId, 1);
  return max;
}

// ---- immutable edits ----

export function updatePerson(people: People, id: string, patch: Partial<Person>): People {
  return { ...people, [id]: { ...people[id], ...patch } };
}

/** Would making `childId` a child of `parentId` create a cycle (or be a self-link)? */
export function wouldCreateCycle(people: People, parentId: string, childId: string): boolean {
  if (parentId === childId) return true;
  // a cycle forms iff the intended parent already lives inside the child's subtree
  return descendantIds(people, childId).has(parentId);
}

/**
 * Can we connect `parentId → childId` (childId becomes a child of parentId)?
 * Disallows self-links, re-parenting the root, no-op reconnections, and any cycle
 * (e.g. connecting a node back onto one of its own ancestors).
 */
export function canConnect(people: People, rootId: string, parentId: string, childId: string): boolean {
  if (!people[parentId] || !people[childId]) return false;
  if (childId === rootId) return false; // the root always stays the root
  if (people[childId].parent === parentId) return false; // already connected
  return !wouldCreateCycle(people, parentId, childId);
}

/**
 * Re-parent `childId` under `newParentId` (pass `null` to detach it into its own root).
 * Keeps both the old and new parent's `children` arrays consistent. Caller guards cycles
 * via `canConnect`.
 */
export function reparent(people: People, childId: string, newParentId: string | null): People {
  const child = people[childId];
  if (!child) return people;
  const next: People = { ...people };
  const oldParent = child.parent;
  if (oldParent && next[oldParent]) {
    next[oldParent] = { ...next[oldParent], children: next[oldParent].children.filter((c) => c !== childId) };
  }
  if (newParentId && next[newParentId] && !next[newParentId].children.includes(childId)) {
    next[newParentId] = { ...next[newParentId], children: [...next[newParentId].children, childId] };
  }
  next[childId] = { ...next[childId], parent: newParentId };
  return next;
}

export function addChild(
  people: People,
  parentId: string,
  data: Pick<Person, 'name' | 'translit' | 'note'>
): { people: People; id: string } {
  const id = newId(people);
  const child: Person = {
    id,
    name: data.name,
    translit: data.translit,
    note: data.note,
    marker: '',
    uncertain: false,
    uncertainReason: '',
    parentUncertain: false,
    parent: parentId,
    children: [],
    sourcePages: [],
    sourceIds: [],
  };
  const next: People = {
    ...people,
    [id]: child,
    [parentId]: { ...people[parentId], children: [...people[parentId].children, id] },
  };
  return { people: next, id };
}

/** Create a new, unconnected (root) node — the flow editor drops one in, then you drag to connect. */
export function addNode(people: People): { people: People; id: string } {
  const id = newId(people);
  const person: Person = {
    id,
    name: '',
    translit: '',
    note: '',
    marker: '',
    uncertain: false,
    uncertainReason: '',
    parentUncertain: false,
    parent: null,
    children: [],
    sourcePages: [],
    sourceIds: [],
  };
  return { people: { ...people, [id]: person }, id };
}

/** Remove a node and its whole subtree; detach from its parent. */
export function removeSubtree(people: People, id: string): People {
  const toRemove = descendantIds(people, id);
  toRemove.add(id);
  const next: People = {};
  for (const [pid, p] of Object.entries(people)) {
    if (toRemove.has(pid)) continue;
    next[pid] = { ...p, children: p.children.filter((c) => !toRemove.has(c)) };
  }
  return next;
}
