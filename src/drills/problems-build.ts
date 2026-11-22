import type { Problem } from './types';

// Original practice problems for backtracking, dynamic programming and tries.

export const BUILD_PROBLEMS: Problem[] = [
  {
    id: 'count-queens',
    pattern: 'backtracking',
    title: 'Count queen boards',
    prompt: ['Return the number of ways to place `n` queens on an `n × n` board so that no two share a row, column or diagonal. `1 <= n <= 9`.'],
    fn: 'countQueens',
    params: 'n',
    tests: [
      { args: [1], expected: 1 },
      { args: [4], expected: 2 },
      { args: [5], expected: 10 },
      { args: [6], expected: 4 },
      { args: [8], expected: 92 },
    ],
    hints: [
      'Exactly one queen goes in each row, so decide one row at a time.',
      'Track which columns and which diagonals are taken. Cells on one diagonal share r − c; on the other, r + c.',
      'Recurse row by row; for each free column mark it, recurse, then unmark. Count when row === n.',
    ],
    solution: `function countQueens(n) {
  const cols = new Set(), diag = new Set(), anti = new Set();
  const place = (r) => {
    if (r === n) return 1;
    let ways = 0;
    for (let c = 0; c < n; c++) {
      if (cols.has(c) || diag.has(r - c) || anti.has(r + c)) continue;
      cols.add(c); diag.add(r - c); anti.add(r + c);
      ways += place(r + 1);
      cols.delete(c); diag.delete(r - c); anti.delete(r + c); // undo the choice
    }
    return ways;
  };
  return place(0);
}`,
    complexity: 'Roughly O(n!) time in the worst case, heavily pruned in practice; O(n) space for the sets and the recursion.',
  },
  {
    id: 'balanced-brackets',
    pattern: 'backtracking',
    title: 'Every balanced string',
    prompt: ['Return every string made of `n` pairs of balanced parentheses, sorted ascending with the default JavaScript string order. For `n = 0` return `[""]`.'],
    fn: 'allBalanced',
    params: 'n',
    tests: [
      { args: [0], expected: [''] },
      { args: [1], expected: ['()'] },
      { args: [2], expected: ['(())', '()()'] },
      { args: [3], expected: ['((()))', '(()())', '(())()', '()(())', '()()()'] },
    ],
    hints: [
      'Build the string one character at a time.',
      'You may add "(" while fewer than n are open in total, and ")" while it would close something.',
      'Track open and close counts. Trying "(" before ")" already yields sorted order, since "(" sorts before ")".',
    ],
    solution: `function allBalanced(n) {
  const out = [];
  const go = (s, open, close) => {
    if (s.length === 2 * n) { out.push(s); return; }
    if (open < n) go(s + '(', open + 1, close);
    if (close < open) go(s + ')', open, close + 1);
  };
  go('', 0, 0);
  return out;
}`,
    complexity: 'O(Cₙ · n) time and space, where Cₙ is the n-th Catalan number of valid strings, each of length 2n.',
  },
  {
    id: 'subset-target',
    pattern: 'backtracking',
    title: 'Subsets that hit the target',
    prompt: [
      'Count the subsets of positions in `nums` whose values add up to exactly `target`. All values are positive. Two subsets are different if they use different positions, even when the values match.',
      'The empty subset counts when `target` is 0.',
    ],
    fn: 'countSubsets',
    params: 'nums, target',
    tests: [
      { args: [[1, 2, 3, 4], 5], expected: 2 },
      { args: [[2, 2, 2], 4], expected: 3 },
      { args: [[5], 3], expected: 0 },
      { args: [[1, 1, 1, 1], 0], expected: 1 },
      { args: [[3, 1, 4, 1, 5], 6], expected: 3 },
    ],
    hints: [
      'Each position is either in or out: two branches per element.',
      'Positive values let you prune: once the running sum passes the target, stop.',
      'go(i, sum): if i === nums.length return sum === target ? 1 : 0; return go(i + 1, sum + nums[i]) + go(i + 1, sum).',
    ],
    solution: `function countSubsets(nums, target) {
  const go = (i, sum) => {
    if (sum > target) return 0; // values are positive: no way back
    if (i === nums.length) return sum === target ? 1 : 0;
    return go(i + 1, sum + nums[i]) + go(i + 1, sum);
  };
  return go(0, 0);
}`,
    complexity: 'O(2ⁿ) time in the worst case, O(n) recursion depth. For large n with small targets, a DP over sums is faster.',
  },
  {
    id: 'trace-word',
    pattern: 'backtracking',
    title: 'Trace a word',
    prompt: [
      '`grid` is an array of equal-length strings of letters. Return `true` if `word` can be spelled by a path of cells that are next to each other horizontally or vertically.',
      'A cell can be used at most once in the path.',
    ],
    fn: 'traceWord',
    params: 'grid, word',
    tests: [
      { args: [['TRAI', 'OPEL', 'SNOW'], 'TRAIL'], expected: true },
      { args: [['TRAI', 'OPEL', 'SNOW'], 'SNOW'], expected: true },
      { args: [['TRAI', 'OPEL', 'SNOW'], 'TRAP'], expected: false },
      { args: [['A'], 'A'], expected: true },
      { args: [['AB'], 'ABA'], expected: false },
    ],
    hints: [
      'Try every cell as a starting point.',
      'From a cell matching word[k], try each neighbour for word[k + 1].',
      'Mark the cell as used before recursing and unmark it afterwards so other paths can use it.',
    ],
    solution: `function traceWord(grid, word) {
  const R = grid.length, C = grid[0].length;
  const used = new Set();
  const go = (r, c, k) => {
    if (r < 0 || c < 0 || r >= R || c >= C) return false;
    if (used.has(r * C + c) || grid[r][c] !== word[k]) return false;
    if (k === word.length - 1) return true;
    used.add(r * C + c);
    const found = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1);
    used.delete(r * C + c); // backtrack
    return found;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true;
  return false;
}`,
    complexity: 'O(R · C · 3^L) time for a word of length L (each step has at most three new directions), O(L) space.',
  },
  {
    id: 'ways-up',
    pattern: 'dynamic-programming',
    title: 'Ways up the trail',
    prompt: ['A climb has `n` steps. Each move goes up 1, 2 or 3 steps. Return the number of different move sequences that reach exactly the top. For `n = 0` there is one way: do nothing.'],
    fn: 'waysUp',
    params: 'n',
    tests: [
      { args: [0], expected: 1 },
      { args: [1], expected: 1 },
      { args: [3], expected: 4 },
      { args: [4], expected: 7 },
      { args: [10], expected: 274 },
    ],
    hints: [
      'The last move into step i came from i − 1, i − 2 or i − 3.',
      'So ways(i) = ways(i − 1) + ways(i − 2) + ways(i − 3), with ways(0) = 1.',
      'Fill an array from 1 to n, treating negative indices as 0, or just keep the last three values.',
    ],
    solution: `function waysUp(n) {
  const ways = [1];
  for (let i = 1; i <= n; i++) {
    ways[i] = (ways[i - 1] || 0) + (ways[i - 2] || 0) + (ways[i - 3] || 0);
  }
  return ways[n];
}`,
    complexity: 'O(n) time, O(n) space (O(1) if you keep only the last three values).',
  },
  {
    id: 'fewest-coins',
    pattern: 'dynamic-programming',
    title: 'Fewest coins',
    prompt: ['You have unlimited coins of each value in `coins`. Return the fewest coins that add up to exactly `amount`, or -1 if it cannot be done.'],
    fn: 'fewestCoins',
    params: 'coins, amount',
    tests: [
      { args: [[1, 3, 4], 6], expected: 2 },
      { args: [[4], 7], expected: -1 },
      { args: [[3], 0], expected: 0 },
      { args: [[1, 5, 10, 25], 63], expected: 6 },
      { args: [[3, 7], 11], expected: -1 },
      { args: [[3, 7], 13], expected: 3 },
    ],
    hints: [
      'Greedy (largest coin first) fails: for [1, 3, 4] and 6 it uses 4 + 1 + 1.',
      'dp[a] = fewest coins for amount a. The last coin used is some c, leaving a − c.',
      'dp[0] = 0, everything else Infinity; dp[a] = min over coins c ≤ a of dp[a − c] + 1.',
    ],
    solution: `function fewestCoins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    complexity: 'O(amount × coins) time, O(amount) space.',
  },
  {
    id: 'lcs-length',
    pattern: 'dynamic-programming',
    title: 'Shared subsequence',
    prompt: ['Return the length of the longest sequence of characters that appears in both `a` and `b` in the same order, not necessarily next to each other.'],
    fn: 'lcsLength',
    params: 'a, b',
    tests: [
      { args: ['kitten', 'sitting'], expected: 4 },
      { args: ['abc', 'def'], expected: 0 },
      { args: ['trail', 'trial'], expected: 4 },
      { args: ['', 'abc'], expected: 0 },
      { args: ['stream', 'master'], expected: 3 },
    ],
    hints: [
      'Compare prefixes: dp[i][j] is the answer for the first i characters of a and the first j of b.',
      'If a[i − 1] === b[j − 1], that character extends dp[i − 1][j − 1].',
      'Otherwise drop one character from either side: max(dp[i − 1][j], dp[i][j − 1]).',
    ],
    solution: `function lcsLength(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}`,
    complexity: 'O(m × n) time and space; keeping only two rows brings space down to O(n).',
  },
  {
    id: 'pack-value',
    pattern: 'dynamic-programming',
    title: 'Pack for value',
    prompt: ['Item `i` weighs `weights[i]` and is worth `values[i]`. Each item can be packed at most once. Return the largest total value whose total weight is at most `cap`.'],
    fn: 'bestValue',
    params: 'weights, values, cap',
    tests: [
      { args: [[2, 3, 5, 6], [3, 5, 8, 9], 8], expected: 13 },
      { args: [[5], [10], 4], expected: 0 },
      { args: [[2, 3, 4, 5], [3, 4, 5, 6], 5], expected: 7 },
      { args: [[], [], 10], expected: 0 },
      { args: [[2, 3, 4, 5], [3, 4, 5, 6], 8], expected: 10 },
    ],
    hints: [
      'For each item there are two choices: skip it or take it.',
      'best[w] = best value within capacity w using the items seen so far.',
      'Loop capacities from high to low for each item: best[w] = max(best[w], best[w − weight] + value). Going downwards stops an item being used twice.',
    ],
    solution: `function bestValue(weights, values, cap) {
  const best = new Array(cap + 1).fill(0);
  weights.forEach((wt, i) => {
    for (let w = cap; w >= wt; w--) { // downwards: each item at most once
      best[w] = Math.max(best[w], best[w - wt] + values[i]);
    }
  });
  return best[cap];
}`,
    complexity: 'O(n × cap) time, O(cap) space with the one-row table.',
  },
  {
    id: 'longest-rise',
    pattern: 'dynamic-programming',
    title: 'Longest rise',
    prompt: ['Return the length of the longest strictly increasing subsequence of `a` (values in order, not necessarily adjacent).'],
    fn: 'longestRise',
    params: 'a',
    tests: [
      { args: [[4, 10, 2, 6, 3, 8, 12, 5]], expected: 4 },
      { args: [[1, 3, 2, 3, 1, 4]], expected: 4 },
      { args: [[7, 7, 7]], expected: 1 },
      { args: [[]], expected: 0 },
    ],
    hints: [
      'dp[i] = length of the longest rise that ends at index i.',
      'dp[i] = 1 + max dp[j] over j < i with a[j] < a[i] (or 1 if none). That is O(n²).',
      'For O(n log n): keep tails[k] = smallest possible last value of a rise of length k + 1, and binary search where each value goes.',
    ],
    solution: `function longestRise(a) {
  const tails = []; // tails[k]: smallest ending value of a rise of length k + 1
  for (const x of a) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1; else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}`,
    complexity: 'O(n log n) time, O(n) space. tails stays sorted, which is what makes the binary search valid.',
  },
  {
    id: 'suggest',
    pattern: 'trie',
    title: 'Autocomplete three',
    prompt: ['Given a list of distinct lowercase `words` and a `prefix`, return up to three words that start with the prefix, in alphabetical order.'],
    fn: 'suggest',
    params: 'words, prefix',
    tests: [
      { args: [['trail', 'tram', 'trek', 'tree', 'trap', 'ridge'], 'tr'], expected: ['trail', 'tram', 'trap'] },
      { args: [['trail', 'tram', 'trek', 'tree', 'trap', 'ridge'], 'tre'], expected: ['tree', 'trek'] },
      { args: [['trail', 'tram', 'trek', 'tree', 'trap', 'ridge'], 'x'], expected: [] },
      { args: [['a', 'ab', 'abc'], ''], expected: ['a', 'ab', 'abc'] },
    ],
    hints: [
      'Build a trie of all words once; then each prefix lookup is cheap.',
      'Walk down the prefix. From that node, a depth-first walk that visits children in a–z order meets words alphabetically.',
      'Record a word when you reach a node marked as an end, before visiting its children, and stop after three.',
    ],
    solution: `function suggest(words, prefix) {
  const root = {};
  for (const w of words) {
    let node = root;
    for (const c of w) node = node[c] ??= {};
    node.$ = w; // end marker holds the word
  }
  let node = root;
  for (const c of prefix) {
    node = node[c];
    if (!node) return [];
  }
  const out = [];
  const walk = (n) => {
    if (out.length === 3) return;
    if (n.$) out.push(n.$);
    for (const c of Object.keys(n).filter((k) => k !== '$').sort()) walk(n[c]);
  };
  walk(node);
  return out;
}`,
    complexity: 'Building is O(total letters). A lookup is O(prefix length) plus the nodes walked until three words are found.',
  },
  {
    id: 'prefix-counts',
    pattern: 'trie',
    title: 'Prefix counts',
    prompt: ['For each string in `queries`, count how many entries of `words` start with it. Return the counts in query order. Duplicate words count separately; the empty query matches every word.'],
    fn: 'countPrefixes',
    params: 'words, queries',
    tests: [
      { args: [['apple', 'app', 'apt', 'bat'], ['ap', 'app', 'b', 'c']], expected: [3, 2, 1, 0] },
      { args: [[], ['a']], expected: [0] },
      { args: [['a', 'a'], ['a', '']], expected: [2, 2] },
    ],
    hints: [
      'Checking every word for every query is O(words × queries).',
      'In a trie, store at each node how many words pass through it.',
      'Answer a query by walking its letters; the count at the last node is the answer (0 if the walk falls off). The root count is the total.',
    ],
    solution: `function countPrefixes(words, queries) {
  const root = { n: 0, kids: {} };
  for (const w of words) {
    let node = root;
    node.n++;
    for (const c of w) {
      node = node.kids[c] ??= { n: 0, kids: {} };
      node.n++;
    }
  }
  return queries.map((q) => {
    let node = root;
    for (const c of q) {
      node = node.kids[c];
      if (!node) return 0;
    }
    return node.n;
  });
}`,
    complexity: 'O(total letters in words + total letters in queries) time, O(total letters in words) space.',
  },
  {
    id: 'shortest-roots',
    pattern: 'trie',
    title: 'Shorten to roots',
    prompt: [
      '`roots` is a list of word roots. In `sentence` (words separated by single spaces), replace each word that starts with some root by the shortest such root. Leave other words as they are.',
      'Return the new sentence.',
    ],
    fn: 'replaceWithRoots',
    params: 'roots, sentence',
    tests: [
      { args: [['trail', 'camp', 'map'], 'trailhead camping maps are campy'], expected: 'trail camp map are camp' },
      { args: [['x', 'y', 'xy'], 'xylo yak zed xx'], expected: 'x y zed x' },
      { args: [['tr', 'trail'], 'trailhead trees'], expected: 'tr tr' },
      { args: [[], 'keep it'], expected: 'keep it' },
    ],
    hints: [
      'Put every root in a trie with an end marker.',
      'For each word, walk the trie letter by letter.',
      'The first end marker you meet is the shortest root; if you fall off the trie first, keep the word.',
    ],
    solution: `function replaceWithRoots(roots, sentence) {
  const root = {};
  for (const r of roots) {
    let node = root;
    for (const c of r) node = node[c] ??= {};
    node.end = true;
  }
  return sentence.split(' ').map((word) => {
    let node = root;
    for (let i = 0; i < word.length; i++) {
      node = node[word[i]];
      if (!node) break;
      if (node.end) return word.slice(0, i + 1);
    }
    return word;
  }).join(' ');
}`,
    complexity: 'O(total root letters + sentence length) time, O(total root letters) space.',
  },
];
