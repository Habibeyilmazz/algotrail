// Node positions in abstract units; renderers scale them into an SVG viewBox.

export interface Pos {
  x: number;
  y: number;
}

/** Tidy-enough tree layout: leaves take consecutive columns, parents sit over their children. */
export function layoutForest(nodes: { id: string; parent: string | null }[]): Map<string, Pos> {
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<string, string[]>();
  const roots: string[] = [];
  for (const n of nodes) {
    // A parent that is missing from the list would orphan the node; treat it as a root instead.
    if (n.parent === null || !ids.has(n.parent)) roots.push(n.id);
    else kids.set(n.parent, [...(kids.get(n.parent) ?? []), n.id]);
  }
  const pos = new Map<string, Pos>();
  let nextLeaf = 0;
  const place = (id: string, depth: number, trail: Set<string>): number => {
    if (trail.has(id)) return nextLeaf; // defensive: cycles never come from our algorithms
    trail.add(id);
    const children = kids.get(id) ?? [];
    let x: number;
    if (children.length === 0) x = nextLeaf++;
    else {
      const xs = children.map((c) => place(c, depth + 1, trail));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(id, { x, y: depth });
    return x;
  };
  for (const r of roots) place(r, 0, new Set());
  return pos;
}

/** Evenly spaced on a circle, first node at the top, clockwise. */
export function layoutCircle(ids: string[]): Map<string, Pos> {
  const pos = new Map<string, Pos>();
  const n = ids.length;
  ids.forEach((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    pos.set(id, n === 1 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) });
  });
  return pos;
}
