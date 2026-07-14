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

/** Expand one more layer: expand every currently-visible node that still has hidden children. */
export function expandNextLayer(people: People, rootId: string, expanded: Set<string>): Set<string> {
  const next = new Set(expanded);
  for (const { id } of computeVisible(people, rootId, expanded)) {
    if (people[id].children.length && !next.has(id)) next.add(id);
  }
  return next;
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
