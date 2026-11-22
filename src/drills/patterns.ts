export interface Pattern {
  id: string;
  name: string;
  /** Clues in a problem statement that point at this pattern. */
  signals: string[];
  /** The one idea to hold on to while coding it. */
  core: string;
  template: string;
  visualizers: string[];
}

export const PATTERNS: Pattern[] = [
  {
    id: 'binary-search',
    name: 'Binary search',
    signals: ['Sorted input, or an answer that is "monotone": once it works, every bigger value works too', 'Asked for O(log n), or n is huge', '"Smallest x such that…", "first position where…"'],
    core: 'Keep a range that always contains the answer and cut it in half every step. Decide up front whether hi is inclusive.',
    template: 'let lo = 0, hi = n; // answer in [lo, hi]\nwhile (lo < hi) {\n  const mid = (lo + hi) >> 1;\n  if (ok(mid)) hi = mid; else lo = mid + 1;\n}\nreturn lo;',
    visualizers: ['binary-search'],
  },
  {
    id: 'two-pointers',
    name: 'Two pointers',
    signals: ['Sorted array, pair or triple with a target sum', 'Compare from both ends (palindromes)', 'Merge two sorted sequences'],
    core: 'Each move rules out a whole row of candidates, so two indices walk the array once instead of trying every pair.',
    template: 'let i = 0, j = a.length - 1;\nwhile (i < j) {\n  if (good(i, j)) return [i, j];\n  if (tooSmall(i, j)) i++; else j--;\n}',
    visualizers: ['two-pointers'],
  },
  {
    id: 'sliding-window',
    name: 'Sliding window',
    signals: ['Contiguous subarray or substring', '"Longest", "shortest" or "count" of windows meeting a condition', 'All values positive (sums only grow as the window grows)'],
    core: 'Grow the right edge every step; shrink the left edge only while the window breaks the rule. Each index enters and leaves once.',
    template: 'let left = 0;\nfor (let right = 0; right < n; right++) {\n  add(a[right]);\n  while (broken()) remove(a[left++]);\n  best = Math.max(best, right - left + 1);\n}',
    visualizers: ['sliding-window'],
  },
  {
    id: 'graph-search',
    name: 'BFS and DFS',
    signals: ['Grid of cells, islands, mazes, connected pieces', 'Fewest steps with equal-cost moves (BFS)', 'Explore everything reachable (either)'],
    core: 'Mark a node as seen when you add it to the queue or stack, never later, so nothing is processed twice.',
    template: 'const seen = new Set([start]);\nconst queue = [start];\nwhile (queue.length) {\n  const u = queue.shift();\n  for (const v of neighbours(u))\n    if (!seen.has(v)) { seen.add(v); queue.push(v); }\n}',
    visualizers: ['grid-bfs', 'grid-dfs', 'graph-bfs', 'graph-dfs'],
  },
  {
    id: 'shortest-path',
    name: 'Shortest paths',
    signals: ['Weighted edges, all weights ≥ 0', '"Cheapest", "fastest", "minimum total cost" route', 'Grid where moves cost different amounts'],
    core: 'Always expand the closest unsettled node. With non-negative weights, the first time a node leaves the heap its distance is final.',
    template: 'dist[s] = 0; heap.push([0, s]);\nwhile (heap.size) {\n  const [d, u] = heap.pop();\n  if (d > dist[u]) continue; // stale entry\n  for (const [v, w] of adj[u])\n    if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); }\n}',
    visualizers: ['dijkstra'],
  },
  {
    id: 'topological-sort',
    name: 'Topological sort',
    signals: ['Tasks with prerequisites, "must happen before"', 'Detect a cycle in a directed graph', 'Build order, course schedule, layers of a DAG'],
    core: 'A node is ready when its count of unfinished prerequisites hits zero. If some nodes never get there, there is a cycle.',
    template: 'const ready = nodes.filter(v => indeg[v] === 0);\nwhile (ready.length) {\n  const u = ready.shift(); order.push(u);\n  for (const v of out[u]) if (--indeg[v] === 0) ready.push(v);\n}\nreturn order.length === n ? order : null;',
    visualizers: ['topological-sort'],
  },
  {
    id: 'union-find',
    name: 'Union-find',
    signals: ['Groups that only ever merge', '"Are a and b connected?" asked many times', 'Find the edge that closes a cycle'],
    core: 'Every set is a tree named by its root. Union joins roots; find flattens the path it walks.',
    template: 'const parent = [...Array(n).keys()];\nconst find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));\nconst union = (a, b) => {\n  const ra = find(a), rb = find(b);\n  if (ra === rb) return false;\n  parent[ra] = rb; return true;\n};',
    visualizers: ['union-find'],
  },
  {
    id: 'heap',
    name: 'Heaps',
    signals: ['"k largest", "k smallest", "k closest"', 'Repeatedly take the smallest or largest of a changing set', 'Merge several sorted streams'],
    core: 'A heap gives the minimum in O(1) and updates in O(log n). For the k largest, keep a min-heap of size k and evict its root.',
    template: 'for (const x of nums) {\n  heap.push(x);\n  if (heap.size > k) heap.pop(); // drop the smallest\n}\nreturn heap.peek();',
    visualizers: ['heap'],
  },
  {
    id: 'sorting',
    name: 'Sorting and divide and conquer',
    signals: ['Intervals, meetings, overlaps (sort by start first)', 'Counting pairs out of order', 'Partition by a pivot or a few known values'],
    core: 'Sorting first often turns a quadratic scan into a linear one. Divide and conquer solves halves, then does the real work while combining.',
    template: 'function solve(lo, hi) {\n  if (hi - lo < 2) return base;\n  const mid = (lo + hi) >> 1;\n  const left = solve(lo, mid), right = solve(mid, hi);\n  return combine(left, right);\n}',
    visualizers: ['quick-sort', 'merge-sort'],
  },
  {
    id: 'backtracking',
    name: 'Backtracking',
    signals: ['"All", "every", "count the ways" over choices', 'Small n (often ≤ 15)', 'Placements under constraints: boards, paths, subsets'],
    core: 'Make a choice, recurse, undo the choice. Prune as soon as a partial answer cannot work.',
    template: 'function go(state) {\n  if (complete(state)) { record(state); return; }\n  for (const choice of options(state)) {\n    if (!valid(choice)) continue;\n    apply(choice); go(state); undo(choice);\n  }\n}',
    visualizers: ['n-queens'],
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic programming',
    signals: ['"How many ways", "minimum cost", "maximum value"', 'Choices at each step whose sub-results repeat', 'Two sequences compared position by position'],
    core: 'Name the state in words ("best value using the first i items with capacity w"), write how it builds from smaller states, then fill a table in an order that has those ready.',
    template: 'const dp = Array(n + 1).fill(base);\nfor (let i = 1; i <= n; i++)\n  for (const step of choices)\n    if (i - step >= 0) dp[i] = best(dp[i], dp[i - step] + cost);\nreturn dp[n];',
    visualizers: ['lcs', 'knapsack', 'coin-change'],
  },
  {
    id: 'trie',
    name: 'Tries',
    signals: ['Many lookups by prefix', 'Autocomplete, dictionaries, word games', 'Replace or match words by their start'],
    core: 'Each node is one letter of a shared prefix. A lookup costs the length of the word, not the size of the dictionary.',
    template: 'const root = {};\nfor (const w of words) {\n  let node = root;\n  for (const c of w) node = node[c] ??= {};\n  node.end = true;\n}',
    visualizers: ['trie'],
  },
];

export const patternById = (id: string) => PATTERNS.find((p) => p.id === id);
