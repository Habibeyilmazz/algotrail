import { parseEdges, recorder, type ParsedGraph } from './parse';
import { InputError, type Algo, type GraphPanel, type Tone } from './types';

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

function adjacency(g: ParsedGraph, directed: boolean) {
  const adj = new Map<string, { to: string; weight: number }[]>(g.nodes.map((n) => [n, []]));
  for (const e of g.edges) {
    adj.get(e.from)!.push({ to: e.to, weight: e.weight });
    if (!directed) adj.get(e.to)!.push({ to: e.from, weight: e.weight });
  }
  adj.forEach((list) => list.sort((x, y) => byName(x.to, y.to)));
  return adj;
}

function startNode(raw: string, g: ParsedGraph) {
  const s = raw.trim();
  if (!g.nodes.includes(s)) throw new InputError(`Start: "${s}" is not a node in the edge list.`);
  return s;
}

const ek = (a: string, b: string) => `${a}>${b}`;

function graphPanel(g: ParsedGraph, directed: boolean, weighted: boolean, nodeTones: Record<string, Tone>, edgeTones: Record<string, Tone>, badges: Record<string, string> = {}): GraphPanel {
  return {
    kind: 'graph',
    directed,
    nodes: g.nodes.map((id) => ({ id, badge: badges[id] })),
    edges: g.edges.map((e) => ({ from: e.from, to: e.to, weight: weighted ? e.weight : undefined })),
    nodeTones: { ...nodeTones },
    edgeTones: { ...edgeTones },
  };
}

const TRAVERSAL_EDGES = 'A B, A C, B D, C D, C E, D F, E F, F G, H I';

export const graphBfs: Algo = {
  id: 'graph-bfs',
  title: 'BFS on a graph',
  group: 'Graphs',
  pattern: 'graph-search',
  summary: 'Visit nodes in order of hop distance from the start using a queue.',
  complexity: 'O(V + E) time, O(V) space',
  pseudocode: [
    'queue ← [s], seen ← {s}',
    'while queue is not empty:',
    '  u ← queue.popFront(); visit u',
    '  for each neighbour v of u:',
    '    if v not seen: seen.add(v), queue.push(v)',
    'every node reachable from s is visited',
  ],
  inputs: [
    { id: 'edges', label: 'Undirected edges', initial: TRAVERSAL_EDGES, multiline: true, help: 'Pairs like "A B", separated by commas or lines.' },
    { id: 'start', label: 'Start node', initial: 'A' },
  ],
  run(input) {
    const g = parseEdges(input.edges);
    const s = startNode(input.start, g);
    const adj = adjacency(g, false);
    const { frames, push } = recorder();
    const queue = [s];
    const seen = new Set([s]);
    const order: string[] = [];
    const hops: Record<string, string> = { [s]: '0' };
    const tree: Record<string, Tone> = {};
    const snap = (line: number, note: string, u: string | null, edge?: [string, string]) => {
      const nt: Record<string, Tone> = {};
      seen.forEach((n) => (nt[n] = 'compare'));
      order.forEach((n) => (nt[n] = 'done'));
      if (u) nt[u] = 'active';
      const et = { ...tree };
      if (edge) et[ek(...edge)] = 'active';
      push({
        line,
        note,
        vars: { u: u ?? '—', visited: order.length },
        panels: [graphPanel(g, false, false, nt, et, hops), { kind: 'list', title: 'Queue (front first)', items: [...queue] }, { kind: 'list', title: 'Visit order', items: [...order] }],
      });
    };
    snap(0, `Start at ${s}. Badges show hop distance.`, null);
    while (queue.length) {
      snap(1, `${queue.length} in the queue.`, null);
      const u = queue.shift()!;
      order.push(u);
      snap(2, `Visit ${u}.`, u);
      for (const { to: v } of adj.get(u)!) {
        if (seen.has(v)) {
          snap(3, `${v} was already seen.`, u, [u, v]);
          continue;
        }
        seen.add(v);
        queue.push(v);
        hops[v] = String(Number(hops[u]) + 1);
        tree[ek(u, v)] = 'path';
        snap(4, `${v} is new: ${hops[v]} hop${hops[v] === '1' ? '' : 's'} from ${s}. Queue it.`, u, [u, v]);
      }
    }
    const missed = g.nodes.filter((n) => !seen.has(n));
    snap(5, missed.length ? `Done. ${missed.join(', ')} cannot be reached from ${s}.` : 'Done. Every node was reached.', null);
    return frames;
  },
};

export const graphDfs: Algo = {
  id: 'graph-dfs',
  title: 'DFS on a graph',
  group: 'Graphs',
  pattern: 'graph-search',
  summary: 'Follow one branch as deep as it goes before backing up, using recursion.',
  complexity: 'O(V + E) time, O(V) recursion depth',
  pseudocode: [
    'dfs(u):',
    '  mark u visited',
    '  for each neighbour v of u:',
    '    if v not visited: dfs(v)',
    '  u is finished; return to caller',
  ],
  inputs: graphBfs.inputs,
  run(input) {
    const g = parseEdges(input.edges);
    const s = startNode(input.start, g);
    const adj = adjacency(g, false);
    const { frames, push } = recorder();
    const visited: string[] = [];
    const finished = new Set<string>();
    const stack: string[] = [];
    const tree: Record<string, Tone> = {};
    const snap = (line: number, note: string, u: string | null, edge?: [string, string]) => {
      const nt: Record<string, Tone> = {};
      visited.forEach((n) => (nt[n] = 'compare'));
      finished.forEach((n) => (nt[n] = 'done'));
      if (u) nt[u] = 'active';
      const et = { ...tree };
      if (edge) et[ek(...edge)] = 'active';
      const badges = Object.fromEntries(visited.map((n, i) => [n, `#${i + 1}`]));
      push({
        line,
        note,
        vars: { u: u ?? '—', depth: stack.length },
        panels: [graphPanel(g, false, false, nt, et, badges), { kind: 'list', title: 'Call stack (top first)', items: [...stack].reverse() }],
      });
    };
    const dfs = (u: string) => {
      stack.push(u);
      visited.push(u);
      snap(1, `Enter ${u}; it is visit #${visited.length}.`, u);
      for (const { to: v } of adj.get(u)!) {
        if (visited.includes(v)) {
          snap(2, `${v} is already visited.`, u, [u, v]);
          continue;
        }
        tree[ek(u, v)] = 'path';
        snap(3, `Go deeper: ${u} → ${v}.`, u, [u, v]);
        dfs(v);
        snap(2, `Back in ${u}.`, u);
      }
      finished.add(u);
      stack.pop();
      snap(4, `${u} has no unvisited neighbours left.`, u);
    };
    snap(0, `Call dfs(${s}). Badges show visit order.`, null);
    dfs(s);
    return frames;
  },
};

export const dijkstra: Algo = {
  id: 'dijkstra',
  title: "Dijkstra's shortest paths",
  group: 'Graphs',
  pattern: 'shortest-path',
  summary: 'Settle nodes in order of distance with a min-heap; relax each edge out of a settled node.',
  complexity: 'O((V + E) log V) with a binary heap',
  pseudocode: [
    'dist[s] ← 0, all others ∞; heap ← [(0, s)]',
    'while heap is not empty:',
    '  (d, u) ← heap.popMin()',
    '  if u is already settled: skip',
    '  settle u',
    '  for each edge u–v with weight w:',
    '    if d + w < dist[v]: dist[v] ← d + w, prev[v] ← u, heap.push((dist[v], v))',
    'dist holds every shortest distance',
  ],
  inputs: [
    { id: 'edges', label: 'Weighted undirected edges', initial: 'A B 4, A C 2, C B 1, B D 5, C D 8, C E 10, D E 2, D F 6, E F 3', multiline: true, help: 'Triples like "A B 4". Weights 0-99.' },
    { id: 'start', label: 'Start node', initial: 'A' },
  ],
  run(input) {
    const g = parseEdges(input.edges, { weighted: true });
    const s = startNode(input.start, g);
    const adj = adjacency(g, false);
    const { frames, push } = recorder();
    const dist = new Map<string, number>(g.nodes.map((n) => [n, Infinity]));
    const prev = new Map<string, string>();
    const settled = new Set<string>();
    let heap: [number, string][] = [[0, s]];
    dist.set(s, 0);
    const snap = (line: number, note: string, u: string | null, edge?: [string, string], edgeTone: Tone = 'compare') => {
      const nt: Record<string, Tone> = {};
      dist.forEach((d, n) => d < Infinity && (nt[n] = 'compare'));
      settled.forEach((n) => (nt[n] = 'done'));
      if (u) nt[u] = 'active';
      const et: Record<string, Tone> = {};
      prev.forEach((p, n) => (et[ek(p, n)] = 'path'));
      if (edge) et[ek(...edge)] = edgeTone;
      const badges = Object.fromEntries([...dist].map(([n, d]) => [n, d === Infinity ? '∞' : String(d)]));
      push({
        line,
        note,
        vars: { u: u ?? '—', settled: settled.size },
        panels: [graphPanel(g, false, true, nt, et, badges), { kind: 'list', title: 'Min-heap (smallest first)', items: heap.map(([d, n]) => `${n}: ${d}`) }],
      });
    };
    snap(0, `${s} starts at distance 0; everything else is ∞.`, null);
    while (heap.length) {
      snap(1, `${heap.length} entr${heap.length > 1 ? 'ies' : 'y'} in the heap.`, null);
      heap.sort((x, y) => x[0] - y[0] || byName(x[1], y[1]));
      const [d, u] = heap.shift()!;
      snap(2, `Pop ${u} with distance ${d}.`, u);
      if (settled.has(u)) {
        snap(3, `${u} is already settled with a shorter distance; this entry is stale.`, u);
        continue;
      }
      settled.add(u);
      snap(4, `${u} is settled: no shorter path to it can exist.`, u);
      for (const { to: v, weight: w } of adj.get(u)!) {
        if (settled.has(v)) continue;
        if (d + w < dist.get(v)!) {
          const old = dist.get(v)!;
          dist.set(v, d + w);
          prev.set(v, u);
          heap.push([d + w, v]);
          heap = [...heap].sort((x, y) => x[0] - y[0] || byName(x[1], y[1]));
          snap(6, `${d} + ${w} = ${d + w} beats ${old === Infinity ? '∞' : old}. Update ${v}.`, u, [u, v], 'active');
        } else {
          snap(5, `${d} + ${w} = ${d + w} does not beat ${dist.get(v)} for ${v}.`, u, [u, v]);
        }
      }
    }
    snap(7, 'All reachable nodes are settled. Green edges form the shortest-path tree.', null);
    return frames;
  },
};

export const topoSort: Algo = {
  id: 'topological-sort',
  title: 'Topological sort',
  group: 'Graphs',
  pattern: 'topological-sort',
  summary: "Kahn's algorithm: repeatedly take a node with no remaining prerequisites.",
  complexity: 'O(V + E) time and space',
  pseudocode: [
    'indeg[v] ← number of edges into v',
    'queue ← every v with indeg[v] = 0',
    'while queue is not empty:',
    '  u ← queue.popFront(); order.push(u)',
    '  for each edge u → v:',
    '    indeg[v] ← indeg[v] − 1; if indeg[v] = 0: queue.push(v)',
    'if order is shorter than V: the graph has a cycle',
  ],
  inputs: [{ id: 'edges', label: 'Directed edges (before → after)', initial: 'A B, A C, B D, C D, D E, F C, F E', multiline: true, help: '"A B" means A must come before B.' }],
  run(input) {
    const g = parseEdges(input.edges, { directed: true });
    const adj = adjacency(g, true);
    const { frames, push } = recorder();
    const indeg = new Map<string, number>(g.nodes.map((n) => [n, 0]));
    g.edges.forEach((e) => indeg.set(e.to, indeg.get(e.to)! + 1));
    const queue: string[] = [];
    const order: string[] = [];
    const used: Record<string, Tone> = {};
    const snap = (line: number, note: string, u: string | null, edge?: [string, string]) => {
      const nt: Record<string, Tone> = {};
      queue.forEach((n) => (nt[n] = 'compare'));
      order.forEach((n) => (nt[n] = 'done'));
      if (u) nt[u] = 'active';
      const et = { ...used };
      if (edge) et[ek(...edge)] = 'active';
      const badges = Object.fromEntries([...indeg].map(([n, d]) => [n, `in ${d}`]));
      push({
        line,
        note,
        vars: { u: u ?? '—', placed: `${order.length}/${g.nodes.length}` },
        panels: [graphPanel(g, true, false, nt, et, badges), { kind: 'list', title: 'Ready queue', items: [...queue] }, { kind: 'list', title: 'Order', items: [...order] }],
      });
    };
    snap(0, 'Count incoming edges for each node.', null);
    g.nodes.forEach((n) => indeg.get(n) === 0 && queue.push(n));
    snap(1, queue.length ? `${queue.join(', ')} ${queue.length > 1 ? 'have' : 'has'} no prerequisites.` : 'No node is free of prerequisites.', null);
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u);
      snap(3, `Place ${u} next in the order.`, u);
      for (const { to: v } of adj.get(u)!) {
        indeg.set(v, indeg.get(v)! - 1);
        used[ek(u, v)] = 'muted';
        if (indeg.get(v) === 0) queue.push(v);
        snap(5, indeg.get(v) === 0 ? `${v} has no prerequisites left. Queue it.` : `${v} still waits on ${indeg.get(v)} more.`, u, [u, v]);
      }
    }
    const cyclic = order.length < g.nodes.length;
    snap(6, cyclic ? `Only ${order.length} of ${g.nodes.length} placed: the rest are on a cycle or wait on one.` : `Done: ${order.join(' → ')}.`, null);
    return frames;
  },
};
