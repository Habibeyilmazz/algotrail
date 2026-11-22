import { parseNumber, parseNumbers, parseWord, recorder } from './parse';
import { InputError, type Algo, type GridPanel, type Tone } from './types';

const cell = (v: number) => (v === Infinity ? '∞' : String(v));

export const nQueens: Algo = {
  id: 'n-queens',
  title: 'N-Queens backtracking',
  group: 'Backtracking',
  pattern: 'backtracking',
  summary: 'Place one queen per row; when a row has no safe column, undo the last choice and try the next one.',
  complexity: 'Exponential in n; pruning keeps small boards fast',
  pseudocode: [
    'place(row):',
    '  if row = n: a full board is a solution',
    '  for col in 0 … n − 1:',
    '    if col and both diagonals are free:',
    '      put a queen at (row, col); place(row + 1)',
    '      remove that queen (backtrack)',
    'no column works: return to the previous row',
  ],
  inputs: [{ id: 'n', label: 'Board size n (4-8)', initial: '6' }],
  run(input) {
    const n = parseNumber(input.n, 'Board size', 4, 8);
    const { frames, push } = recorder();
    const queens: number[] = []; // queens[row] = col
    let tries = 0;
    const snap = (line: number, note: string, tones: Record<string, Tone> = {}) => {
      const cells = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (queens[r] === c ? '♛' : '')));
      const t: Record<string, Tone> = {};
      queens.forEach((c, r) => (t[`${r},${c}`] = 'done'));
      const grid: GridPanel = { kind: 'grid', board: true, cells, tones: { ...t, ...tones } };
      push({ line, note, vars: { row: queens.length, placed: queens.length, tries }, panels: [grid] });
    };
    const attacker = (row: number, col: number) => queens.findIndex((c, r) => c === col || Math.abs(c - col) === row - r);
    const place = (row: number): boolean => {
      if (row === n) {
        snap(1, `All ${n} queens placed without conflicts.`);
        return true;
      }
      for (let col = 0; col < n; col++) {
        tries++;
        const hit = attacker(row, col);
        if (hit >= 0) {
          snap(3, `(${row}, ${col}) is attacked by the queen at (${hit}, ${queens[hit]}).`, { [`${row},${col}`]: 'bad', [`${hit},${queens[hit]}`]: 'compare' });
          continue;
        }
        queens.push(col);
        snap(4, `Place a queen at (${row}, ${col}) and move to row ${row + 1}.`, { [`${row},${col}`]: 'active' });
        if (place(row + 1)) return true;
        queens.pop();
        snap(5, `Row ${row + 1} had no safe column. Remove the queen at (${row}, ${col}).`, { [`${row},${col}`]: 'muted' });
      }
      snap(6, `No safe column in row ${row}. Back up.`);
      return false;
    };
    snap(0, `Empty ${n}×${n} board. Fill it row by row.`);
    if (!place(0)) snap(6, 'No solution exists for this board.');
    return frames;
  },
};

function table(rows: string[], cols: string[], values: (number | string)[][], tones: Record<string, Tone>): GridPanel {
  return { kind: 'grid', rowLabels: rows, colLabels: cols, cells: values.map((r) => r.map((v) => (typeof v === 'number' ? cell(v) : v))), tones };
}

export const lcs: Algo = {
  id: 'lcs',
  title: 'Longest common subsequence',
  group: 'Dynamic programming',
  pattern: 'dynamic-programming',
  summary: 'dp[i][j] is the LCS length of the first i letters of A and the first j letters of B.',
  complexity: 'O(m × n) time and space',
  pseudocode: [
    'dp[i][0] ← 0, dp[0][j] ← 0',
    'for i in 1 … m, for j in 1 … n:',
    '  if A[i] = B[j]: dp[i][j] ← dp[i−1][j−1] + 1',
    '  else: dp[i][j] ← max(dp[i−1][j], dp[i][j−1])',
    'walk back from dp[m][n] to read one LCS',
  ],
  inputs: [
    { id: 'a', label: 'Text A', initial: 'STREAM' },
    { id: 'b', label: 'Text B', initial: 'MASTER' },
  ],
  run(input) {
    const A = parseWord(input.a, 'Text A', { maxLen: 9 }).toUpperCase();
    const B = parseWord(input.b, 'Text B', { maxLen: 9 }).toUpperCase();
    const m = A.length;
    const n = B.length;
    const { frames, push } = recorder();
    const dp: (number | string)[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : '')));
    const rows = ['', ...A];
    const cols = ['', ...B];
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<string, Tone> = {}) =>
      push({ line, note, vars, panels: [table(rows, cols, dp, tones)] });
    snap(0, 'An empty prefix shares nothing: first row and column are 0.', {});
    const v = (i: number, j: number) => dp[i][j] as number;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (A[i - 1] === B[j - 1]) {
          dp[i][j] = v(i - 1, j - 1) + 1;
          snap(2, `${A[i - 1]} = ${B[j - 1]}: extend the diagonal, ${v(i - 1, j - 1)} + 1.`, { i, j }, { [`${i},${j}`]: 'active', [`${i - 1},${j - 1}`]: 'compare' });
        } else {
          dp[i][j] = Math.max(v(i - 1, j), v(i, j - 1));
          snap(3, `${A[i - 1]} ≠ ${B[j - 1]}: best of above (${v(i - 1, j)}) and left (${v(i, j - 1)}).`, { i, j }, { [`${i},${j}`]: 'active', [`${i - 1},${j}`]: 'compare', [`${i},${j - 1}`]: 'compare' });
        }
      }
    }
    const path: Record<string, Tone> = {};
    let out = '';
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (A[i - 1] === B[j - 1]) {
        path[`${i},${j}`] = 'done';
        out = A[i - 1] + out;
        i--;
        j--;
      } else if (v(i - 1, j) >= v(i, j - 1)) {
        path[`${i},${j}`] = 'path';
        i--;
      } else {
        path[`${i},${j}`] = 'path';
        j--;
      }
    }
    snap(4, `Length ${dp[m][n]}. Walking back through matches spells "${out}".`, { length: v(m, n), lcs: out || '—' }, path);
    return frames;
  },
};

export const knapsack: Algo = {
  id: 'knapsack',
  title: '0/1 knapsack',
  group: 'Dynamic programming',
  pattern: 'dynamic-programming',
  summary: 'dp[i][w] is the best value using the first i items within capacity w; each item is taken at most once.',
  complexity: 'O(n × W) time and space',
  pseudocode: [
    'dp[0][w] ← 0 for every w',
    'for each item i, for each capacity w:',
    '  skip ← dp[i−1][w]',
    '  if weight[i] ≤ w: take ← dp[i−1][w − weight[i]] + value[i]',
    '  dp[i][w] ← max(skip, take)',
    'walk back up the table to see which items were taken',
  ],
  inputs: [
    { id: 'w', label: 'Item weights', initial: '2 3 4 5' },
    { id: 'v', label: 'Item values', initial: '3 4 5 6' },
    { id: 'cap', label: 'Capacity (1-12)', initial: '8' },
  ],
  run(input) {
    const wt = parseNumbers(input.w, 'Item weights', { min: 1, max: 12, maxLen: 6 });
    const val = parseNumbers(input.v, 'Item values', { min: 0, max: 99, maxLen: 6 });
    if (wt.length !== val.length) throw new InputError('Give exactly one value per weight.');
    const W = parseNumber(input.cap, 'Capacity', 1, 12);
    const n = wt.length;
    const { frames, push } = recorder();
    const dp: (number | string)[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, () => (i === 0 ? 0 : '')));
    const rows = ['none', ...wt.map((w, i) => `#${i + 1} w${w} v${val[i]}`)];
    const cols = Array.from({ length: W + 1 }, (_, w) => String(w));
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<string, Tone> = {}) =>
      push({ line, note, vars, panels: [table(rows, cols, dp, tones)] });
    const v = (i: number, w: number) => dp[i][w] as number;
    snap(0, 'With no items, every capacity is worth 0.', {});
    for (let i = 1; i <= n; i++) {
      for (let w = 0; w <= W; w++) {
        const skip = v(i - 1, w);
        if (wt[i - 1] <= w) {
          const take = v(i - 1, w - wt[i - 1]) + val[i - 1];
          dp[i][w] = Math.max(skip, take);
          snap(4, `Item ${i} fits in ${w}: skip = ${skip}, take = ${v(i - 1, w - wt[i - 1])} + ${val[i - 1]} = ${take}.`, { item: i, w, skip, take }, { [`${i},${w}`]: 'active', [`${i - 1},${w}`]: 'compare', [`${i - 1},${w - wt[i - 1]}`]: 'compare' });
        } else {
          dp[i][w] = skip;
          snap(2, `Item ${i} (weight ${wt[i - 1]}) does not fit in ${w}: copy ${skip} from above.`, { item: i, w, skip }, { [`${i},${w}`]: 'active', [`${i - 1},${w}`]: 'compare' });
        }
      }
    }
    const tones: Record<string, Tone> = {};
    const taken: number[] = [];
    for (let i = n, w = W; i > 0; i--) {
      if (v(i, w) !== v(i - 1, w)) {
        tones[`${i},${w}`] = 'done';
        taken.unshift(i);
        w -= wt[i - 1];
      } else tones[`${i},${w}`] = 'path';
    }
    snap(5, `Best value ${dp[n][W]} using item${taken.length === 1 ? '' : 's'} ${taken.join(', ') || 'none'}.`, { best: v(n, W), items: taken.join(' ') || '—' }, tones);
    return frames;
  },
};

export const coinChange: Algo = {
  id: 'coin-change',
  title: 'Coin change',
  group: 'Dynamic programming',
  pattern: 'dynamic-programming',
  summary: 'dp[a] is the fewest coins that make amount a, built from smaller amounts.',
  complexity: 'O(amount × coins) time, O(amount) space',
  pseudocode: [
    'dp[0] ← 0, dp[a] ← ∞ for a > 0',
    'for a in 1 … amount:',
    '  for each coin c ≤ a:',
    '    dp[a] ← min(dp[a], dp[a − c] + 1)',
    'dp[amount] is the answer (∞ means impossible)',
  ],
  inputs: [
    { id: 'coins', label: 'Coin values', initial: '1 3 4' },
    { id: 'amount', label: 'Amount (1-24)', initial: '10' },
  ],
  run(input) {
    const coins = [...new Set(parseNumbers(input.coins, 'Coin values', { min: 1, max: 24, maxLen: 5 }))].sort((x, y) => x - y);
    const amount = parseNumber(input.amount, 'Amount', 1, 24);
    const { frames, push } = recorder();
    const dp = Array.from({ length: amount + 1 }, (_, a) => (a === 0 ? 0 : Infinity));
    const cols = dp.map((_, a) => String(a));
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<string, Tone> = {}) =>
      push({ line, note, vars, panels: [table(['coins'], cols, [dp], tones)] });
    snap(0, 'Zero coins make 0. Every other amount starts as impossible.', {});
    for (let a = 1; a <= amount; a++) {
      snap(1, `Fill amount ${a}.`, { a }, { [`0,${a}`]: 'active' });
      for (const c of coins) {
        if (c > a) break;
        const cand = dp[a - c] + 1;
        const better = cand < dp[a];
        snap(3, `Coin ${c}: dp[${a - c}] + 1 = ${cell(cand)} ${better ? `beats ${cell(dp[a])}` : `does not beat ${cell(dp[a])}`}.`, { a, coin: c }, { [`0,${a}`]: 'active', [`0,${a - c}`]: 'compare' });
        if (better) dp[a] = cand;
      }
    }
    snap(4, dp[amount] === Infinity ? `${amount} cannot be made from these coins.` : `${amount} needs at least ${dp[amount]} coin${dp[amount] === 1 ? '' : 's'}.`, { answer: cell(dp[amount]) }, { [`0,${amount}`]: 'done' });
    return frames;
  },
};
