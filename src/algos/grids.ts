import { parseMaze, recorder } from './parse';
import type { Algo, Frame, GridPanel, Tone } from './types';

const MAZE = ['S..#......', '.#.#.####.', '.#...#....', '.####.#.#.', '......#.#E'].join('\n');
const DIRS: [number, number, string][] = [[-1, 0, 'up'], [0, 1, 'right'], [1, 0, 'down'], [0, -1, 'left']];
const key = (r: number, c: number) => `${r},${c}`;
const name = (k: string) => `(${k})`;

type Mode = 'bfs' | 'dfs';

function gridSearch(mode: Mode, raw: string): Frame[] {
  const { cells, start, end } = parseMaze(raw);
  const rows = cells.length;
  const cols = cells[0].length;
  const { frames, push } = recorder();
  const seen = new Set<string>();
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();
  const pending: string[] = []; // queue (bfs) or stack (dfs)
  const startK = key(...start);
  const endK = key(...end);
  let path = new Set<string>();

  const snap = (line: number, note: string, current: string | null, extra: Record<string, Tone> = {}) => {
    const tones: Record<string, Tone> = {};
    seen.forEach((k) => (tones[k] = 'range'));
    pending.forEach((k) => (tones[k] = 'compare'));
    path.forEach((k) => (tones[k] = 'path'));
    if (current) tones[current] = 'active';
    Object.assign(tones, extra);
    const shown = cells.map((row, r) =>
      row.map((ch, c) => {
        if (ch === '#' || ch === 'S' || ch === 'E') return ch;
        const d = dist.get(key(r, c));
        return mode === 'bfs' && d !== undefined ? String(d) : '';
      }),
    );
    const grid: GridPanel = { kind: 'grid', board: true, cells: shown, tones };
    push({
      line,
      note,
      vars: { current: current ? name(current) : '—', [mode === 'bfs' ? 'queue' : 'stack']: pending.length, visited: seen.size },
      panels: [grid, { kind: 'list', title: mode === 'bfs' ? 'Queue (front first)' : 'Stack (top first)', items: (mode === 'bfs' ? pending : [...pending].reverse()).map(name) }],
    });
  };

  const trace = () => {
    path = new Set<string>();
    for (let k: string | undefined = endK; k; k = parent.get(k)) path.add(k);
    return path.size - 1;
  };

  const neighbours = (k: string) => {
    const [r, c] = k.split(',').map(Number);
    const out: [string, string][] = [];
    for (const [dr, dc, label] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc] !== '#') out.push([key(nr, nc), label]);
    }
    return out;
  };

  if (mode === 'bfs') {
    pending.push(startK);
    seen.add(startK);
    dist.set(startK, 0);
    snap(0, 'Put the start in the queue at distance 0.', null);
    while (pending.length) {
      snap(1, `${pending.length} cell${pending.length > 1 ? 's' : ''} waiting in the queue.`, null);
      const cur = pending.shift()!;
      snap(2, `Take ${name(cur)} from the front, distance ${dist.get(cur)}.`, cur);
      if (cur === endK) {
        const len = trace();
        snap(3, `Reached E. Shortest path has ${len} steps.`, cur);
        return frames;
      }
      const added: string[] = [];
      for (const [nb] of neighbours(cur)) {
        if (seen.has(nb)) continue;
        seen.add(nb);
        dist.set(nb, dist.get(cur)! + 1);
        parent.set(nb, cur);
        pending.push(nb);
        added.push(nb);
      }
      snap(added.length ? 5 : 4, added.length ? `Queue ${added.map(name).join(', ')} at distance ${dist.get(cur)! + 1}.` : 'No unseen open neighbours.', cur);
    }
  } else {
    pending.push(startK);
    snap(0, 'Push the start onto the stack.', null);
    while (pending.length) {
      snap(1, `${pending.length} cell${pending.length > 1 ? 's' : ''} on the stack.`, null);
      const cur = pending.pop()!;
      if (seen.has(cur)) {
        snap(3, `${name(cur)} was already explored; skip it.`, null, { [cur]: 'muted' });
        continue;
      }
      seen.add(cur);
      snap(2, `Pop ${name(cur)} and explore it.`, cur);
      if (cur === endK) {
        const len = trace();
        snap(4, `Reached E along a path of ${len} steps. DFS finds a path, not always the shortest.`, cur);
        return frames;
      }
      const added: string[] = [];
      for (const [nb] of [...neighbours(cur)].reverse()) {
        if (seen.has(nb)) continue;
        parent.set(nb, cur);
        pending.push(nb);
        added.push(nb);
      }
      snap(5, added.length ? `Push ${added.map(name).join(', ')}. The last one pushed is explored next.` : 'Dead end: nothing new to push.', cur);
    }
  }
  snap(6, 'Nothing left to explore: E cannot be reached.', null);
  return frames;
}

const mazeInput = [
  {
    id: 'grid',
    label: 'Maze',
    initial: MAZE,
    multiline: true,
    help: '. open, # wall, S start, E end. Up to 10 rows by 14 columns.',
  },
];

export const gridBfs: Algo = {
  id: 'grid-bfs',
  title: 'BFS on a grid',
  group: 'Graphs',
  pattern: 'graph-search',
  summary: 'Breadth-first search fans out one ring at a time, so the first time it reaches E is the shortest path.',
  complexity: 'O(rows × cols) time and space',
  pseudocode: [
    'queue ← [S], dist[S] ← 0',
    'while queue is not empty:',
    '  cell ← queue.popFront()',
    '  if cell = E: trace parents back to S, done',
    '  for each open neighbour nb of cell:',
    '    if nb unseen: dist[nb] ← dist[cell] + 1, parent[nb] ← cell, queue.push(nb)',
    'E is unreachable',
  ],
  inputs: mazeInput,
  run: (input) => gridSearch('bfs', input.grid),
};

export const gridDfs: Algo = {
  id: 'grid-dfs',
  title: 'DFS on a grid',
  group: 'Graphs',
  pattern: 'graph-search',
  summary: 'Depth-first search with an explicit stack dives down one corridor until it hits a dead end, then backs up.',
  complexity: 'O(rows × cols) time and space',
  pseudocode: [
    'stack ← [S]',
    'while stack is not empty:',
    '  cell ← stack.pop(); mark cell explored',
    '  (if cell was already explored: skip it)',
    '  if cell = E: trace parents back to S, done',
    '  for each unexplored open neighbour nb: parent[nb] ← cell, stack.push(nb)',
    'E is unreachable',
  ],
  inputs: mazeInput,
  run: (input) => gridSearch('dfs', input.grid),
};
