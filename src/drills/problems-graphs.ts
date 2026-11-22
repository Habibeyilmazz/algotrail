import type { Problem } from './types';

// Original practice problems for shortest paths, topological sort, union-find, heaps and sorting.

const HEAP = `// A small binary min-heap on [priority, value] pairs (JavaScript has none built in).
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}`;

export const GRAPH_PROBLEMS: Problem[] = [
  {
    id: 'beacon-relay',
    pattern: 'shortest-path',
    title: 'Beacon relay',
    prompt: [
      'Camps are numbered 1 to n. Each relay `[from, to, minutes]` means a beacon lit at `from` becomes visible at `to` after that many minutes (one way only).',
      'Camp `k` lights its beacon at minute 0. Return the minute when the last camp sees a beacon, or -1 if some camp never does.',
    ],
    fn: 'allCampsLit',
    params: 'n, relays, k',
    tests: [
      { args: [4, [[2, 1, 1], [2, 3, 1], [3, 4, 1]], 2], expected: 2 },
      { args: [2, [[1, 2, 1]], 1], expected: 1 },
      { args: [2, [[1, 2, 1]], 2], expected: -1 },
      { args: [3, [[1, 2, 4], [1, 3, 1], [3, 2, 2]], 1], expected: 3 },
      { args: [1, [], 1], expected: 0 },
    ],
    hints: [
      'Each camp lights at its shortest travel time from k.',
      'Weights are non-negative, so Dijkstra gives every shortest time.',
      'Answer = max of all shortest times; if any is still Infinity, return -1.',
    ],
    solution: `${HEAP}

function allCampsLit(n, relays, k) {
  const out = Array.from({ length: n + 1 }, () => []);
  for (const [u, v, w] of relays) out[u].push([v, w]);
  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  const heap = new MinHeap();
  heap.push([0, k]);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue; // stale entry
    for (const [v, w] of out[u]) {
      if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); }
    }
  }
  const last = Math.max(...dist.slice(1));
  return last === Infinity ? -1 : last;
}`,
    complexity: 'O((n + e) log e) time with a binary heap, O(n + e) space. Skipping stale heap entries replaces a decrease-key operation.',
  },
  {
    id: 'cheapest-route',
    pattern: 'shortest-path',
    title: 'Cheapest route',
    prompt: ['Towns are numbered 0 to n − 1. Each road `[a, b, cost]` goes both ways. Return the cheapest total cost from town `s` to town `t`, or -1 if there is no route.'],
    fn: 'cheapestRoute',
    params: 'n, roads, s, t',
    tests: [
      { args: [4, [[0, 1, 5], [0, 2, 1], [2, 1, 2], [1, 3, 1]], 0, 3], expected: 4 },
      { args: [3, [[0, 1, 1]], 0, 2], expected: -1 },
      { args: [2, [], 1, 1], expected: 0 },
      { args: [5, [[0, 1, 2], [1, 2, 2], [0, 2, 5], [2, 3, 1], [3, 4, 3], [2, 4, 7]], 0, 4], expected: 8 },
    ],
    hints: [
      'The direct road is not always the cheapest: 0 → 2 → 1 can beat 0 → 1.',
      'Use Dijkstra from s; add each road in both directions.',
      'You can stop as soon as t is popped from the heap with a non-stale distance.',
    ],
    solution: `${HEAP}

function cheapestRoute(n, roads, s, t) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b, w] of roads) { adj[a].push([b, w]); adj[b].push([a, w]); }
  const dist = new Array(n).fill(Infinity);
  dist[s] = 0;
  const heap = new MinHeap();
  heap.push([0, s]);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    if (u === t) return d; // first non-stale pop is final
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); }
    }
  }
  return -1;
}`,
    complexity: 'O((n + e) log e) time, O(n + e) space. Early exit helps in practice but not the worst case.',
  },
  {
    id: 'grid-toll',
    pattern: 'shortest-path',
    title: 'Toll grid',
    prompt: [
      '`grid[r][c]` is the toll (≥ 0) for entering that cell. Start in the top-left cell and finish in the bottom-right one, moving up, down, left or right.',
      'A route costs the sum of the tolls of every cell on it, including the first and last. Return the cheapest cost.',
    ],
    fn: 'minToll',
    params: 'grid',
    tests: [
      { args: [[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], expected: 7 },
      { args: [[[5]]], expected: 5 },
      { args: [[[1, 9, 1, 1, 1], [1, 9, 1, 9, 1], [1, 1, 1, 9, 1]]], expected: 11 },
      { args: [[[0, 0], [0, 0]]], expected: 0 },
    ],
    hints: [
      'Moves can go up and left too, so a simple row-by-row DP is not enough.',
      'Treat each cell as a node; the edge into a cell costs that cell’s toll.',
      'Dijkstra with dist[0][0] = grid[0][0]; relaxing a neighbour adds the neighbour’s toll.',
    ],
    solution: `${HEAP}

function minToll(grid) {
  const R = grid.length, C = grid[0].length;
  const dist = grid.map((row) => row.map(() => Infinity));
  dist[0][0] = grid[0][0];
  const heap = new MinHeap();
  heap.push([dist[0][0], 0, 0]);
  while (heap.size) {
    const [d, r, c] = heap.pop();
    if (d > dist[r][c]) continue;
    if (r === R - 1 && c === C - 1) return d;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
      const nd = d + grid[nr][nc];
      if (nd < dist[nr][nc]) { dist[nr][nc] = nd; heap.push([nd, nr, nc]); }
    }
  }
}`,
    complexity: 'O(RC log(RC)) time, O(RC) space. The third test needs an upward move, which is why Dijkstra and not a two-direction DP.',
  },
  {
    id: 'can-finish',
    pattern: 'topological-sort',
    title: 'Can it all get done?',
    prompt: ['There are `n` tasks numbered 0 to n − 1. Each pair `[a, b]` in `deps` means task `a` must be finished before task `b` starts. Return `true` if every task can be finished.'],
    fn: 'canFinishAll',
    params: 'n, deps',
    tests: [
      { args: [2, [[0, 1]]], expected: true },
      { args: [2, [[0, 1], [1, 0]]], expected: false },
      { args: [3, []], expected: true },
      { args: [4, [[0, 1], [1, 2], [2, 3], [3, 1]]], expected: false },
      { args: [1, []], expected: true },
    ],
    hints: [
      'It is impossible exactly when the dependencies form a cycle.',
      'Count, for each task, how many prerequisites are unfinished.',
      'Repeatedly finish tasks whose count is 0 and lower the counts of tasks that wait on them. Did you finish all n?',
    ],
    solution: `function canFinishAll(n, deps) {
  const out = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [a, b] of deps) { out[a].push(b); indeg[b]++; }
  const ready = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) ready.push(v);
  let done = 0;
  while (ready.length) {
    const u = ready.pop();
    done++;
    for (const v of out[u]) if (--indeg[v] === 0) ready.push(v);
  }
  return done === n;
}`,
    complexity: "O(n + e) time and space (Kahn's algorithm). Tasks on a cycle never reach in-degree 0, so done stays below n.",
  },
  {
    id: 'build-order',
    pattern: 'topological-sort',
    title: 'Smallest build order',
    prompt: [
      'Same input as before: `n` tasks and pairs `[a, b]` meaning `a` before `b`. Return an order of all tasks that respects every pair.',
      'Whenever several tasks are ready, take the smallest-numbered one first, so the answer is unique. Return `[]` if no order exists.',
    ],
    fn: 'buildOrder',
    params: 'n, deps',
    tests: [
      { args: [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], expected: [3, 1, 2, 0] },
      { args: [3, []], expected: [0, 1, 2] },
      { args: [2, [[0, 1], [1, 0]]], expected: [] },
      { args: [5, [[4, 0], [3, 0], [2, 1]]], expected: [2, 1, 3, 4, 0] },
    ],
    hints: [
      "Kahn's algorithm, but the ready set needs to hand out the smallest task first.",
      'A min-heap does that in O(log n); for small inputs, picking the minimum of a plain array also works.',
      'Remember to return [] when the order is shorter than n.',
    ],
    solution: `function buildOrder(n, deps) {
  const out = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (const [a, b] of deps) { out[a].push(b); indeg[b]++; }
  const ready = [];
  for (let v = 0; v < n; v++) if (indeg[v] === 0) ready.push(v);
  const order = [];
  while (ready.length) {
    // shortcut: linear min instead of a heap; fine for small n
    let m = 0;
    for (let i = 1; i < ready.length; i++) if (ready[i] < ready[m]) m = i;
    const u = ready.splice(m, 1)[0];
    order.push(u);
    for (const v of out[u]) if (--indeg[v] === 0) ready.push(v);
  }
  return order.length === n ? order : [];
}`,
    complexity: 'O(n² + e) as written because of the linear minimum; with a min-heap it is O((n + e) log n). O(n + e) space.',
  },
  {
    id: 'fewest-semesters',
    pattern: 'topological-sort',
    title: 'Fewest semesters',
    prompt: [
      'Courses are numbered 1 to n. Each pair `[a, b]` means course `a` must be passed in an earlier semester than course `b`. You may take any number of courses per semester.',
      'Return the minimum number of semesters to pass every course, or -1 if it is impossible.',
    ],
    fn: 'minSemesters',
    params: 'n, prereqs',
    tests: [
      { args: [3, [[1, 3], [2, 3]]], expected: 2 },
      { args: [3, [[1, 2], [2, 3], [3, 1]]], expected: -1 },
      { args: [4, []], expected: 1 },
      { args: [5, [[1, 2], [2, 3], [3, 4], [1, 5]]], expected: 4 },
    ],
    hints: [
      'Take every ready course each semester: there is no reason to wait.',
      'Process Kahn’s algorithm in layers: one layer is everything ready at the same time.',
      'Count the layers. If fewer than n courses were taken overall, there is a cycle.',
    ],
    solution: `function minSemesters(n, prereqs) {
  const out = Array.from({ length: n + 1 }, () => []);
  const indeg = new Array(n + 1).fill(0);
  for (const [a, b] of prereqs) { out[a].push(b); indeg[b]++; }
  let layer = [];
  for (let v = 1; v <= n; v++) if (indeg[v] === 0) layer.push(v);
  let semesters = 0, taken = 0;
  while (layer.length) {
    semesters++;
    taken += layer.length;
    const next = [];
    for (const u of layer) for (const v of out[u]) if (--indeg[v] === 0) next.push(v);
    layer = next;
  }
  return taken === n ? semesters : -1;
}`,
    complexity: 'O(n + e) time and space. The number of layers equals the longest chain of prerequisites.',
  },
  {
    id: 'extra-cable',
    pattern: 'union-find',
    title: 'The extra cable',
    prompt: [
      'Machines are numbered from 1. Cables `[a, b]` are added one at a time in the given order. Return the first cable that joins two machines which were already connected through earlier cables.',
      'Return `[]` if no cable is redundant.',
    ],
    fn: 'firstRedundant',
    params: 'cables',
    tests: [
      { args: [[[1, 2], [1, 3], [2, 3]]], expected: [2, 3] },
      { args: [[[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]], expected: [1, 4] },
      { args: [[[1, 2], [3, 4], [2, 3], [4, 1]]], expected: [4, 1] },
      { args: [[[1, 2]]], expected: [] },
    ],
    hints: [
      'Keep track of which machines are already connected as cables arrive.',
      'Union-find answers "same group?" in near-constant time.',
      'For each cable: if find(a) === find(b), it is redundant; otherwise union them.',
    ],
    solution: `function firstRedundant(cables) {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x))); // path halving
      x = parent.get(x);
    }
    return x;
  };
  for (const [a, b] of cables) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return [a, b];
    parent.set(ra, rb);
  }
  return [];
}`,
    complexity: 'O(e · α(n)) time, which is effectively linear, and O(n) space. Path halving keeps the trees shallow.',
  },
  {
    id: 'equations',
    pattern: 'union-find',
    title: 'Consistent statements',
    prompt: [
      'Each statement is a four-character string, either `"x==y"` or `"x!=y"`, where `x` and `y` are lowercase letters standing for unknown values.',
      'Return `true` if you can assign values so that every statement holds.',
    ],
    fn: 'consistent',
    params: 'statements',
    tests: [
      { args: [['a==b', 'b!=a']], expected: false },
      { args: [['b==a', 'a==b']], expected: true },
      { args: [['a==b', 'b==c', 'a==c']], expected: true },
      { args: [['a==b', 'b!=c', 'c==a']], expected: false },
      { args: [['c==c', 'b==d', 'x!=z']], expected: true },
      { args: [['a!=a']], expected: false },
    ],
    hints: [
      'Equalities are transitive: they build groups.',
      'Process all "==" first, then check each "!=".',
      'A "!=" fails when both letters ended up in the same union-find group.',
    ],
    solution: `function consistent(statements) {
  const parent = [...Array(26).keys()];
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const id = (c) => c.charCodeAt(0) - 97;
  for (const s of statements) if (s[1] === '=') parent[find(id(s[0]))] = find(id(s[3]));
  for (const s of statements) if (s[1] === '!' && find(id(s[0])) === find(id(s[3]))) return false;
  return true;
}`,
    complexity: 'O(n · α(26)) = O(n) time, O(1) space for the fixed 26-letter alphabet.',
  },
  {
    id: 'groups-over-time',
    pattern: 'union-find',
    title: 'Groups after each handshake',
    prompt: [
      '`n` people (0 to n − 1) start as strangers. Handshakes arrive in order as pairs `[a, b]`; a handshake merges the two people’s groups.',
      'Return an array with the number of separate groups right after each handshake.',
    ],
    fn: 'groupsAfterEach',
    params: 'n, shakes',
    tests: [
      { args: [4, [[0, 1], [2, 3], [1, 0], [1, 2]]], expected: [3, 2, 2, 1] },
      { args: [2, []], expected: [] },
      { args: [3, [[0, 0]]], expected: [3] },
      { args: [5, [[0, 4], [1, 4], [2, 3], [3, 1]]], expected: [4, 3, 2, 1] },
    ],
    hints: [
      'Rebuilding groups from scratch after every handshake is far too slow for long lists.',
      'Start with groups = n. A handshake lowers the count only when it joins two different groups.',
      'Union returns whether it merged anything; decrement on true.',
    ],
    solution: `function groupsAfterEach(n, shakes) {
  const parent = [...Array(n).keys()];
  const size = new Array(n).fill(1);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  let groups = n;
  const out = [];
  for (const [a, b] of shakes) {
    let ra = find(a), rb = find(b);
    if (ra !== rb) {
      if (size[ra] < size[rb]) [ra, rb] = [rb, ra]; // union by size
      parent[rb] = ra;
      size[ra] += size[rb];
      groups--;
    }
    out.push(groups);
  }
  return out;
}`,
    complexity: 'O(n + m · α(n)) time for m handshakes, O(n) space.',
  },
  {
    id: 'kth-largest',
    pattern: 'heap',
    title: 'K-th largest reading',
    prompt: ['Return the `k`-th largest value in `nums`, counting duplicates (so in `[7, 7, 3]` the 2nd largest is 7). Aim for O(n log k).'],
    fn: 'kthLargest',
    params: 'nums, k',
    tests: [
      { args: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { args: [[1], 1], expected: 1 },
      { args: [[7, 7, 7], 2], expected: 7 },
    ],
    hints: [
      'Sorting works in O(n log n). Can you keep only k values around?',
      'Keep the k largest values seen so far in a min-heap.',
      'When the heap grows past k, pop its minimum. At the end the root is the answer.',
    ],
    solution: `${HEAP}

function kthLargest(nums, k) {
  const heap = new MinHeap();
  for (const x of nums) {
    heap.push([x]);
    if (heap.size > k) heap.pop(); // evict the smallest of the k + 1
  }
  return heap.a[0][0];
}`,
    complexity: 'O(n log k) time, O(k) space. The heap never holds more than k + 1 values.',
  },
  {
    id: 'merge-lists',
    pattern: 'heap',
    title: 'Merge many sorted lists',
    prompt: ['`lists` holds several lists, each sorted ascending. Return one sorted list with all their values.'],
    fn: 'mergeLists',
    params: 'lists',
    tests: [
      { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]], expected: [1, 1, 2, 3, 4, 4, 5, 6] },
      { args: [[]], expected: [] },
      { args: [[[], [2], []]], expected: [2] },
      { args: [[[5], [1], [3]]], expected: [1, 3, 5] },
    ],
    hints: [
      'The next output value is the smallest of the current heads of the lists.',
      'Put one [value, listIndex, position] entry per non-empty list in a min-heap.',
      'Pop the smallest, output it, and push the next element from the same list.',
    ],
    solution: `${HEAP}

function mergeLists(lists) {
  const heap = new MinHeap();
  lists.forEach((l, i) => l.length && heap.push([l[0], i, 0]));
  const out = [];
  while (heap.size) {
    const [v, i, j] = heap.pop();
    out.push(v);
    if (j + 1 < lists[i].length) heap.push([lists[i][j + 1], i, j + 1]);
  }
  return out;
}`,
    complexity: 'O(N log k) time for N values across k lists, O(k) heap space plus the output.',
  },
  {
    id: 'join-ropes',
    pattern: 'heap',
    title: 'Join the rope pieces',
    prompt: [
      'Joining two rope pieces of lengths `a` and `b` costs `a + b` and leaves one piece of length `a + b`.',
      'Return the minimum total cost to join all `pieces` into one rope (0 if there is at most one piece).',
    ],
    fn: 'joinCost',
    params: 'pieces',
    tests: [
      { args: [[4, 3, 2, 6]], expected: 29 },
      { args: [[5]], expected: 0 },
      { args: [[1, 2, 3, 4, 5]], expected: 33 },
      { args: [[]], expected: 0 },
    ],
    hints: [
      'A piece joined early gets paid for again in every later join.',
      'So the two shortest pieces should be joined first.',
      'Use a min-heap: pop two, add their sum to the cost, push the sum back. Repeat until one piece is left.',
    ],
    solution: `${HEAP}

function joinCost(pieces) {
  const heap = new MinHeap();
  for (const p of pieces) heap.push([p]);
  let cost = 0;
  while (heap.size > 1) {
    const joined = heap.pop()[0] + heap.pop()[0];
    cost += joined;
    heap.push([joined]);
  }
  return cost;
}`,
    complexity: 'O(n log n) time, O(n) space. This is the same greedy idea as building a Huffman code.',
  },
  {
    id: 'count-inversions',
    pattern: 'sorting',
    title: 'Out-of-order pairs',
    prompt: ['Return how many pairs `i < j` have `a[i] > a[j]`. Aim for O(n log n) rather than checking every pair.'],
    fn: 'countInversions',
    params: 'a',
    tests: [
      { args: [[2, 4, 1, 3, 5]], expected: 3 },
      { args: [[5, 4, 3, 2, 1]], expected: 10 },
      { args: [[1, 2, 3]], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [[3, 3, 1]], expected: 2 },
    ],
    hints: [
      'Merge sort compares elements from the left half with elements from the right half.',
      'When a right-half element is taken before some left-half elements, it is smaller than all of the ones still waiting.',
      'In the merge step, when you take right[j], add (number of left elements not yet taken). Take left first on ties so equal values do not count.',
    ],
    solution: `function countInversions(a) {
  const sort = (arr) => {
    if (arr.length < 2) return [arr, 0];
    const mid = arr.length >> 1;
    const [left, x] = sort(arr.slice(0, mid));
    const [right, y] = sort(arr.slice(mid));
    const merged = [];
    let i = 0, j = 0, count = x + y;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) merged.push(left[i++]);
      else { merged.push(right[j++]); count += left.length - i; }
    }
    return [merged.concat(left.slice(i), right.slice(j)), count];
  };
  return sort(a)[1];
}`,
    complexity: 'O(n log n) time, O(n) space: the counting rides along with the merge for free.',
  },
  {
    id: 'merge-bookings',
    pattern: 'sorting',
    title: 'Merge bookings',
    prompt: [
      'Each booking is `[start, end]` with `start <= end`, both inclusive. Merge bookings that overlap or touch (one ends at or after the next one starts).',
      'Return the merged bookings sorted by start.',
    ],
    fn: 'mergeBookings',
    params: 'bookings',
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[5, 7], [1, 2]]], expected: [[1, 2], [5, 7]] },
      { args: [[]], expected: [] },
      { args: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]] },
    ],
    hints: [
      'Sort by start time first.',
      'After sorting, a booking can only overlap the last merged one.',
      'If start <= last.end, extend last.end = max(last.end, end); otherwise start a new merged booking.',
    ],
    solution: `function mergeBookings(bookings) {
  const sorted = [...bookings].sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}`,
    complexity: 'O(n log n) time for the sort, then one O(n) pass. O(n) space for the copy and output.',
  },
  {
    id: 'three-flags',
    pattern: 'sorting',
    title: 'Three flag colours',
    prompt: ['`a` contains only 0, 1 and 2. Rearrange it in place so all 0s come first, then 1s, then 2s, in one pass with O(1) extra space, and return the same array.'],
    fn: 'sortFlags',
    params: 'a',
    tests: [
      { args: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { args: [[2, 0, 1]], expected: [0, 1, 2] },
      { args: [[]], expected: [] },
      { args: [[1, 1]], expected: [1, 1] },
      { args: [[2, 2, 0, 0]], expected: [0, 0, 2, 2] },
    ],
    hints: [
      'Keep three regions: 0s at the front, 2s at the back, unknown in the middle.',
      'Use pointers low, mid and high. Look at a[mid].',
      '0: swap with low, advance both. 1: advance mid. 2: swap with high and move high back, but do not advance mid (the swapped-in value is unchecked).',
    ],
    solution: `function sortFlags(a) {
  let low = 0, mid = 0, high = a.length - 1;
  while (mid <= high) {
    if (a[mid] === 0) { [a[low], a[mid]] = [a[mid], a[low]]; low++; mid++; }
    else if (a[mid] === 1) mid++;
    else { [a[mid], a[high]] = [a[high], a[mid]]; high--; }
  }
  return a;
}`,
    complexity: 'O(n) time, O(1) space: each step either advances mid or shrinks high, so the loop runs at most n times.',
  },
];
