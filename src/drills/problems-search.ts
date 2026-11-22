import type { Problem } from './types';

// Original practice problems for binary search, two pointers, sliding window and graph search.

export const SEARCH_PROBLEMS: Problem[] = [
  {
    id: 'first-departure',
    pattern: 'binary-search',
    title: 'First departure',
    prompt: [
      'A station board lists departure times in minutes after midnight, sorted ascending. The same minute can appear more than once.',
      'You arrive at minute `t`. Return the index of the first departure at or after `t`. If every train has already left, return `times.length`.',
    ],
    fn: 'firstDeparture',
    params: 'times, t',
    tests: [
      { args: [[5, 12, 12, 30, 47], 12], expected: 1 },
      { args: [[5, 12, 12, 30, 47], 13], expected: 3 },
      { args: [[5, 12], 60], expected: 2 },
      { args: [[], 3], expected: 0 },
      { args: [[8, 9, 10], 1], expected: 0 },
    ],
    hints: [
      'The answer can be any index from 0 to times.length, so search a half-open range.',
      'If times[mid] < t, the answer is strictly right of mid. Otherwise mid itself might be the answer.',
      'Use lo = 0, hi = times.length and loop while lo < hi: either lo = mid + 1 or hi = mid. Return lo.',
    ],
    solution: `function firstDeparture(times, t) {
  let lo = 0, hi = times.length; // the answer is always in [lo, hi]
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1; // mid has left already
    else hi = mid;                    // mid works; maybe something earlier does too
  }
  return lo;
}`,
    complexity: 'O(log n) time, O(1) space. Each loop halves the range [lo, hi), and the duplicates never confuse it because a match only moves hi.',
  },
  {
    id: 'floor-sqrt',
    pattern: 'binary-search',
    title: 'Whole square root',
    prompt: ['Return the largest whole number `r` with `r * r <= n`, for `0 <= n <= 2147483647`. Do not use `Math.sqrt` or `**`.'],
    fn: 'floorSqrt',
    params: 'n',
    tests: [
      { args: [0], expected: 0 },
      { args: [1], expected: 1 },
      { args: [15], expected: 3 },
      { args: [16], expected: 4 },
      { args: [2147395599], expected: 46339 },
      { args: [2147483647], expected: 46340 },
    ],
    hints: [
      'If r works, every smaller number works too. That is the monotone shape binary search needs.',
      'Search for the last value that works rather than the first.',
      'Take the upper middle, mid = Math.ceil((lo + hi) / 2): if mid * mid <= n then lo = mid, else hi = mid - 1. The upper middle stops the loop getting stuck when hi = lo + 1.',
    ],
    solution: `function floorSqrt(n) {
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2); // upper middle so lo = mid always moves
    if (mid * mid <= n) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}`,
    complexity: 'O(log n) time, O(1) space: about 31 iterations for the largest input.',
  },
  {
    id: 'rotated-minimum',
    pattern: 'binary-search',
    title: 'Rotated log',
    prompt: [
      'A sorted list of distinct readings was rotated: some prefix was cut off and appended to the end, so `[1, 2, 3, 4, 5]` might now be `[3, 4, 5, 1, 2]`.',
      'Return the smallest reading in O(log n) time. The list is never empty.',
    ],
    fn: 'rotatedMin',
    params: 'a',
    tests: [
      { args: [[3, 4, 5, 1, 2]], expected: 1 },
      { args: [[1, 2, 3]], expected: 1 },
      { args: [[2, 1]], expected: 1 },
      { args: [[7]], expected: 7 },
      { args: [[5, 6, 7, 8, 9, 1, 2]], expected: 1 },
    ],
    hints: [
      'Compare the middle with the last element, not the first.',
      'If a[mid] > a[hi], the drop (and the minimum) is somewhere right of mid.',
      'Otherwise the minimum is at mid or left of it: hi = mid. Stop when lo === hi.',
    ],
    solution: `function rotatedMin(a) {
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] > a[hi]) lo = mid + 1; // the drop is right of mid
    else hi = mid;                    // mid..hi is sorted, min is at mid or left
  }
  return a[lo];
}`,
    complexity: 'O(log n) time, O(1) space. Comparing with a[hi] tells which half holds the rotation point.',
  },
  {
    id: 'trail-days',
    pattern: 'binary-search',
    title: 'Trail days',
    prompt: [
      'A trail is a list of segment lengths in kilometres, in order. You will hike all of them, in order, over at most `days` days. Each day covers a run of whole consecutive segments.',
      'Return the smallest possible length of your longest day. A segment can be up to 10^9 km long.',
    ],
    fn: 'minLongestDay',
    params: 'segments, days',
    tests: [
      { args: [[7, 2, 5, 10, 8], 2], expected: 18 },
      { args: [[1, 2, 3, 4, 5], 2], expected: 9 },
      { args: [[4, 4, 4], 3], expected: 4 },
      { args: [[4, 4, 4], 1], expected: 12 },
      { args: [[10, 1, 1, 1], 5], expected: 10 },
      { args: [[1000000000, 1000000000], 2], expected: 1000000000 },
    ],
    hints: [
      'Instead of searching the plan, search the answer: the daily limit.',
      'Given a limit, you can check in one greedy pass whether the trail fits in `days` days: keep walking until the next segment would break the limit.',
      'The limit is between max(segments) and sum(segments). Binary search for the smallest limit that fits. The sum can pass 2^31, so take the middle with Math.floor, not >> 1.',
    ],
    solution: `function minLongestDay(segments, days) {
  const fits = (limit) => {
    let used = 1, today = 0;
    for (const s of segments) {
      if (today + s > limit) { used++; today = 0; } // start a new day
      today += s;
    }
    return used <= days;
  };
  let lo = Math.max(...segments);
  let hi = segments.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2); // sums can pass 2^31, where >> 1 breaks
    if (fits(mid)) hi = mid; else lo = mid + 1;
  }
  return lo;
}`,
    complexity: 'O(n log S) time where S is the total length: each of the log S guesses costs one O(n) greedy check. O(1) extra space.',
  },
  {
    id: 'pair-budget',
    pattern: 'two-pointers',
    title: 'Pair on a budget',
    prompt: [
      'Gear prices are sorted ascending. Find two different positions `i < j` whose prices add up to exactly `budget`, and return `[i, j]`.',
      'At most one such pair exists. If there is none, return `[-1, -1]`. Use O(1) extra space.',
    ],
    fn: 'pairForBudget',
    params: 'prices, budget',
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[1, 3, 4, 6, 8, 11], 10], expected: [2, 3] },
      { args: [[1, 2], 4], expected: [-1, -1] },
      { args: [[-3, 0, 5, 9], 6], expected: [0, 3] },
      { args: [[5, 5], 10], expected: [0, 1] },
    ],
    hints: [
      'Start with the cheapest and the most expensive item.',
      'If their sum is too small, no pair using the cheapest item can work, so move the left pointer right.',
      'Too big: move the right pointer left. Stop when the pointers meet.',
    ],
    solution: `function pairForBudget(prices, budget) {
  let i = 0, j = prices.length - 1;
  while (i < j) {
    const s = prices[i] + prices[j];
    if (s === budget) return [i, j];
    if (s < budget) i++; // prices[i] is too cheap for any partner
    else j--;            // prices[j] is too expensive for any partner
  }
  return [-1, -1];
}`,
    complexity: 'O(n) time, O(1) space. Each step discards one index for good, so there are at most n − 1 steps.',
  },
  {
    id: 'clean-palindrome',
    pattern: 'two-pointers',
    title: 'Clean palindrome',
    prompt: [
      'Return `true` if `s` reads the same forwards and backwards after you ignore every character that is not a letter or digit and ignore letter case.',
      'Try to do it without building a cleaned copy of the string.',
    ],
    fn: 'isCleanPalindrome',
    params: 's',
    tests: [
      { args: ['Step on no pets!'], expected: true },
      { args: ['Trail, liart'], expected: true },
      { args: ['rock'], expected: false },
      { args: [''], expected: true },
      { args: ['.,'], expected: true },
      { args: ['ab2a'], expected: false },
      { args: ['0P'], expected: false },
    ],
    hints: [
      'Compare the first and last meaningful characters, then move inward.',
      'Skip characters that are not letters or digits on each side before comparing.',
      'A regex like /[a-z0-9]/i tests one character; compare with toLowerCase().',
    ],
    solution: `function isCleanPalindrome(s) {
  const keep = (c) => /[a-z0-9]/i.test(c);
  let i = 0, j = s.length - 1;
  while (i < j) {
    if (!keep(s[i])) { i++; continue; }
    if (!keep(s[j])) { j--; continue; }
    if (s[i].toLowerCase() !== s[j].toLowerCase()) return false;
    i++; j--;
  }
  return true;
}`,
    complexity: 'O(n) time, O(1) extra space: each pointer only moves inward.',
  },
  {
    id: 'merge-finishes',
    pattern: 'two-pointers',
    title: 'Merge finishing times',
    prompt: ['Two races published their finishing times, each list sorted ascending. Return one sorted list with every time from both. Do not call `sort`.'],
    fn: 'mergeSorted',
    params: 'a, b',
    tests: [
      { args: [[1, 4, 9], [2, 3, 10]], expected: [1, 2, 3, 4, 9, 10] },
      { args: [[], [1]], expected: [1] },
      { args: [[5, 5], [5]], expected: [5, 5, 5] },
      { args: [[], []], expected: [] },
      { args: [[1, 2, 3], [7, 8]], expected: [1, 2, 3, 7, 8] },
    ],
    hints: [
      'Keep one pointer per list.',
      'Copy the smaller of the two current values and advance only that pointer.',
      'When one list runs out, the rest of the other is already sorted: append it.',
    ],
    solution: `function mergeSorted(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) out.push(a[i] <= b[j] ? a[i++] : b[j++]);
  while (i < a.length) out.push(a[i++]);
  while (j < b.length) out.push(b[j++]);
  return out;
}`,
    complexity: 'O(n + m) time and O(n + m) space for the output; every value is copied exactly once.',
  },
  {
    id: 'sorted-squares',
    pattern: 'two-pointers',
    title: 'Squares in order',
    prompt: ['Given whole numbers sorted ascending (negatives allowed), return the square of each one, sorted ascending, in O(n) time.'],
    fn: 'sortedSquares',
    params: 'a',
    tests: [
      { args: [[-4, -1, 0, 3, 10]], expected: [0, 1, 9, 16, 100] },
      { args: [[-7, -3, 2, 3, 11]], expected: [4, 9, 9, 49, 121] },
      { args: [[-2, -1]], expected: [1, 4] },
      { args: [[]], expected: [] },
    ],
    hints: [
      'The largest square is at one of the two ends.',
      'Fill the output from the back.',
      'Compare |a[i]| with |a[j]|; write the bigger square at the current back slot and move that pointer inward.',
    ],
    solution: `function sortedSquares(a) {
  const out = new Array(a.length);
  let i = 0, j = a.length - 1;
  for (let k = a.length - 1; k >= 0; k--) {
    if (Math.abs(a[i]) > Math.abs(a[j])) out[k] = a[i] * a[i++];
    else out[k] = a[j] * a[j--];
  }
  return out;
}`,
    complexity: 'O(n) time, O(n) space for the output. The biggest remaining square is always at an end, so filling from the back never needs a sort.',
  },
  {
    id: 'best-stretch',
    pattern: 'sliding-window',
    title: 'Best k-day stretch',
    prompt: ['`steps[i]` is the step count on day `i`. Return the largest total over any `k` consecutive days. `1 <= k <= steps.length`.'],
    fn: 'maxWindowSum',
    params: 'steps, k',
    tests: [
      { args: [[1, 4, 2, 10, 2, 3, 1, 0, 20], 4], expected: 24 },
      { args: [[5], 1], expected: 5 },
      { args: [[-1, -2, -3], 2], expected: -3 },
      { args: [[3, 3, 3], 3], expected: 9 },
    ],
    hints: [
      'Adding up every window from scratch repeats work.',
      'Moving the window one day right adds one value and removes one value.',
      'Start with the sum of the first k values, then for i from k: sum += steps[i] - steps[i - k]. Initialise best with the first sum, not 0 (totals can be negative).',
    ],
    solution: `function maxWindowSum(steps, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += steps[i];
  let best = sum;
  for (let i = k; i < steps.length; i++) {
    sum += steps[i] - steps[i - k]; // slide: one in, one out
    best = Math.max(best, sum);
  }
  return best;
}`,
    complexity: 'O(n) time, O(1) space. Each slide is constant work instead of O(k).',
  },
  {
    id: 'two-species',
    pattern: 'sliding-window',
    title: 'Two kinds of tree',
    prompt: [
      'A row of trees is written as a string, one letter per species. Find the longest stretch of consecutive trees that contains at most two different species.',
      'Return its length (0 for an empty row).',
    ],
    fn: 'longestTwoKinds',
    params: 's',
    tests: [
      { args: ['abaccc'], expected: 4 },
      { args: ['eceba'], expected: 3 },
      { args: ['aaaa'], expected: 4 },
      { args: [''], expected: 0 },
      { args: ['abcabc'], expected: 2 },
    ],
    hints: [
      'Keep a window and a count of each species inside it.',
      'After adding the right tree, if there are more than two species, shrink from the left.',
      'Use a Map of counts; delete a key when its count drops to 0, so map.size is the number of species.',
    ],
    solution: `function longestTwoKinds(s) {
  const count = new Map();
  let left = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    count.set(s[right], (count.get(s[right]) || 0) + 1);
    while (count.size > 2) {
      const c = s[left++];
      count.set(c, count.get(c) - 1);
      if (count.get(c) === 0) count.delete(c);
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    complexity: 'O(n) time: each tree enters and leaves the window at most once. O(1) space since the map never holds more than three keys.',
  },
  {
    id: 'shortest-enough',
    pattern: 'sliding-window',
    title: 'Shortest stretch that is enough',
    prompt: ['All numbers are positive. Return the length of the shortest run of consecutive numbers whose sum is at least `target`, or 0 if no run is enough.'],
    fn: 'shortestAtLeast',
    params: 'nums, target',
    tests: [
      { args: [[2, 3, 1, 2, 4, 3], 7], expected: 2 },
      { args: [[1, 4, 4], 4], expected: 1 },
      { args: [[1, 1, 1], 5], expected: 0 },
      { args: [[5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15], expected: 2 },
    ],
    hints: [
      'Positive numbers mean a window sum only grows as you extend it.',
      'Extend right until the sum is enough, then shrink from the left as long as it stays enough.',
      'Record the length each time the sum is still ≥ target inside the shrinking loop.',
    ],
    solution: `function shortestAtLeast(nums, target) {
  let left = 0, sum = 0, best = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left++];
    }
  }
  return best === Infinity ? 0 : best;
}`,
    complexity: 'O(n) time, O(1) space. Both edges only move right, so the inner loop runs at most n times in total.',
  },
  {
    id: 'anagram-spots',
    pattern: 'sliding-window',
    title: 'Anagram spots',
    prompt: ['Return every start index `i` (ascending) where the `pattern.length` letters of `text` starting at `i` are a rearrangement of `pattern`. Both strings are lowercase a-z.'],
    fn: 'anagramStarts',
    params: 'text, pattern',
    tests: [
      { args: ['cbaebabacd', 'abc'], expected: [0, 6] },
      { args: ['abab', 'ab'], expected: [0, 1, 2] },
      { args: ['a', 'ab'], expected: [] },
      { args: ['xyz', 'zyx'], expected: [0] },
    ],
    hints: [
      'Two strings are anagrams exactly when their letter counts match.',
      'Use a fixed-size window of length pattern.length and update the counts as it slides.',
      'Keep 26 counts: +1 for the letter entering, −1 for the letter leaving. Compare with the pattern counts, or track how many letters currently match.',
    ],
    solution: `function anagramStarts(text, pattern) {
  const m = pattern.length, out = [];
  if (m > text.length) return out;
  const need = new Array(26).fill(0), have = new Array(26).fill(0);
  const idx = (c) => c.charCodeAt(0) - 97;
  for (const c of pattern) need[idx(c)]++;
  const same = () => need.every((v, i) => v === have[i]);
  for (let i = 0; i < text.length; i++) {
    have[idx(text[i])]++;
    if (i >= m) have[idx(text[i - m])]--; // letter leaving the window
    if (i >= m - 1 && same()) out.push(i - m + 1);
  }
  return out;
}`,
    complexity: 'O(26 · n) = O(n) time, O(1) space. The comparison is over a fixed alphabet, so it does not grow with the input.',
  },
  {
    id: 'count-islands',
    pattern: 'graph-search',
    title: 'Count the islands',
    prompt: [
      'A map is an array of equal-length strings: `"1"` is land, `"0"` is water. Land cells touching up, down, left or right belong to the same island.',
      'Return the number of islands.',
    ],
    fn: 'countIslands',
    params: 'grid',
    tests: [
      { args: [['11000', '11000', '00100', '00011']], expected: 3 },
      { args: [['111', '010', '111']], expected: 1 },
      { args: [['000']], expected: 0 },
      { args: [[]], expected: 0 },
      { args: [['101', '010', '101']], expected: 5 },
    ],
    hints: [
      'Scan every cell. An unvisited land cell starts a new island.',
      'From it, flood out (BFS or DFS) and mark all land you can reach as visited.',
      'Strings are immutable, so keep a separate Set or boolean grid of visited cells. Use an explicit stack to avoid deep recursion.',
    ],
    solution: `function countIslands(grid) {
  const rows = grid.length, cols = rows ? grid[0].length : 0;
  const seen = new Set();
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '1' || seen.has(r * cols + c)) continue;
      islands++;
      const stack = [[r, c]];
      seen.add(r * cols + c);
      while (stack.length) {
        const [y, x] = stack.pop();
        for (const [ny, nx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]]) {
          if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
          if (grid[ny][nx] !== '1' || seen.has(ny * cols + nx)) continue;
          seen.add(ny * cols + nx); // mark when pushed so nothing is pushed twice
          stack.push([ny, nx]);
        }
      }
    }
  }
  return islands;
}`,
    complexity: 'O(rows × cols) time and space: every cell is pushed and popped at most once.',
  },
  {
    id: 'maze-steps',
    pattern: 'graph-search',
    title: 'Fewest moves through a maze',
    prompt: [
      'A maze is an array of strings using `.` for open ground, `#` for walls, one `S` and one `E`. Each move goes up, down, left or right onto a non-wall cell.',
      'Return the fewest moves from `S` to `E`, or -1 if `E` cannot be reached.',
    ],
    fn: 'fewestMoves',
    params: 'grid',
    tests: [
      { args: [['S.#', '..#', '#.E']], expected: 4 },
      { args: [['S#E']], expected: -1 },
      { args: [['SE']], expected: 1 },
      { args: [['S....', '####.', 'E....']], expected: 10 },
    ],
    hints: [
      'Every move costs the same, which is exactly when BFS gives shortest paths.',
      'BFS explores all cells at distance d before any at distance d + 1.',
      'Queue [row, col, distance] entries starting from S; return the distance when you pop E. Use a head index instead of shift() for speed.',
    ],
    solution: `function fewestMoves(grid) {
  const rows = grid.length, cols = grid[0].length;
  let start;
  for (let r = 0; r < rows; r++) {
    const c = grid[r].indexOf('S');
    if (c >= 0) start = [r, c, 0];
  }
  const seen = new Set([start[0] * cols + start[1]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const [r, c, d] = queue[head];
    if (grid[r][c] === 'E') return d;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (grid[nr][nc] === '#' || seen.has(nr * cols + nc)) continue;
      seen.add(nr * cols + nc);
      queue.push([nr, nc, d + 1]);
    }
  }
  return -1;
}`,
    complexity: 'O(rows × cols) time and space. BFS reaches each cell first along a shortest route, so the first time E is popped its distance is minimal.',
  },
  {
    id: 'camp-groups',
    pattern: 'graph-search',
    title: 'Camp groups',
    prompt: ['There are `n` camps numbered 0 to n − 1. Each entry `[a, b]` in `trails` is a two-way trail. Return how many separate groups of camps there are (camps in a group can reach each other).'],
    fn: 'countGroups',
    params: 'n, trails',
    tests: [
      { args: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2 },
      { args: [3, []], expected: 3 },
      { args: [4, [[0, 1], [2, 3], [1, 2]]], expected: 1 },
      { args: [1, []], expected: 1 },
    ],
    hints: [
      'Build an adjacency list first.',
      'Each time you find a camp nobody has visited, you have found a new group.',
      'From that camp, visit everything reachable with DFS or BFS and mark it.',
    ],
    solution: `function countGroups(n, trails) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of trails) { adj[a].push(b); adj[b].push(a); }
  const seen = new Array(n).fill(false);
  let groups = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    groups++;
    seen[s] = true;
    const stack = [s];
    while (stack.length) {
      for (const v of adj[stack.pop()]) {
        if (!seen[v]) { seen[v] = true; stack.push(v); }
      }
    }
  }
  return groups;
}`,
    complexity: 'O(n + e) time and space for n camps and e trails: each camp and trail is handled a constant number of times.',
  },
  {
    id: 'can-reach',
    pattern: 'graph-search',
    title: 'One-way reachability',
    prompt: ['A directed graph has nodes 0 to n − 1 and edges `[from, to]`. Return `true` if you can travel from `a` to `b` along edges. A node can always reach itself.'],
    fn: 'canReach',
    params: 'n, edges, a, b',
    tests: [
      { args: [4, [[0, 1], [1, 2]], 0, 2], expected: true },
      { args: [4, [[0, 1], [1, 2]], 2, 0], expected: false },
      { args: [3, [[0, 1], [1, 0]], 0, 2], expected: false },
      { args: [2, [], 1, 1], expected: true },
      { args: [5, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4]], 1, 4], expected: true },
    ],
    hints: [
      'Only follow edges in their own direction.',
      'Cycles exist, so you must remember what you visited.',
      'Run BFS or DFS from a and stop early when you see b.',
    ],
    solution: `function canReach(n, edges, a, b) {
  const out = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) out[u].push(v);
  const seen = new Set([a]);
  const stack = [a];
  while (stack.length) {
    const u = stack.pop();
    if (u === b) return true;
    for (const v of out[u]) if (!seen.has(v)) { seen.add(v); stack.push(v); }
  }
  return false;
}`,
    complexity: 'O(n + e) time and space. The visited set is what keeps the cycle 0 → 1 → 2 → 0 from looping forever.',
  },
];
