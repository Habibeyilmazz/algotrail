import { describe, expect, it } from 'vitest';
import { ALGOS, algoById, defaults } from './index';
import type { ArrayPanel, Frame, GraphPanel, GridPanel, ListPanel } from './types';
import { InputError } from './types';

const run = (id: string, input: Record<string, string> = {}) => {
  const algo = algoById(id)!;
  return algo.run({ ...defaults(algo), ...input });
};
const last = (f: Frame[]) => f[f.length - 1];
const values = (p: unknown) => (p as ArrayPanel).items.map((x) => x.value);

describe('every visualizer', () => {
  it.each(ALGOS.map((a) => [a.id, a]))('%s runs its default input with valid frames', (_, algo) => {
    const frames = algo.run(defaults(algo));
    expect(frames.length).toBeGreaterThan(2);
    for (const f of frames) {
      expect(f.line).toBeGreaterThanOrEqual(0);
      expect(f.line).toBeLessThan(algo.pseudocode.length);
      expect(f.note.length).toBeGreaterThan(0);
      expect(f.panels.length).toBeGreaterThan(0);
    }
  });

  it('ids are unique', () => {
    expect(new Set(ALGOS.map((a) => a.id)).size).toBe(ALGOS.length);
  });
});

describe('results', () => {
  it('binary search finds or misses', () => {
    expect(last(run('binary-search')).vars.mid).toBe(8);
    expect(last(run('binary-search', { target: '40' })).note).toMatch(/not in the array/);
    expect(() => run('binary-search', { a: '3 1 2' })).toThrow(InputError);
  });

  it('two pointers finds a pair', () => {
    const f = last(run('two-pointers'));
    expect(f.vars.sum).toBe(33);
    expect(last(run('two-pointers', { target: '2' })).note).toMatch(/No pair/);
  });

  it('sliding window measures the longest run without repeats', () => {
    expect(last(run('sliding-window', { s: 'abcabcbb' })).vars.best).toBe(3);
    expect(last(run('sliding-window', { s: 'bbbb' })).vars.best).toBe(1);
  });

  it.each(['quick-sort', 'merge-sort'])('%s ends sorted and keeps every item', (id) => {
    const input = '5 3 9 3 1 8 2';
    const f = last(run(id, { a: input }));
    expect(values(f.panels[0])).toEqual([1, 2, 3, 3, 5, 8, 9]);
    expect(new Set((f.panels[0] as ArrayPanel).items.map((x) => x.key)).size).toBe(7);
  });

  it('grid BFS finds the shortest path length', () => {
    const f = last(run('grid-bfs', { grid: 'S..\n.#.\n..E' }));
    expect(f.note).toMatch(/4 steps/);
    expect(last(run('grid-bfs', { grid: 'S#\n#E' })).note).toMatch(/cannot be reached/);
    expect(last(run('grid-dfs', { grid: 'S#\n#E' })).note).toMatch(/cannot be reached/);
    expect(last(run('grid-dfs')).note).toMatch(/Reached E/);
  });

  it('graph BFS reports unreachable nodes', () => {
    expect(last(run('graph-bfs')).note).toMatch(/H, I cannot be reached/);
    const order = (last(run('graph-bfs')).panels[2] as ListPanel).items;
    expect(order).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  it('graph DFS visits depth first', () => {
    const f = last(run('graph-dfs'));
    const badges = Object.fromEntries((f.panels[0] as GraphPanel).nodes.map((n) => [n.id, n.badge]));
    expect(badges).toMatchObject({ A: '#1', B: '#2', D: '#3', C: '#4', E: '#5', F: '#6', G: '#7' });
  });

  it('dijkstra computes shortest distances', () => {
    const f = last(run('dijkstra'));
    const d = Object.fromEntries((f.panels[0] as GraphPanel).nodes.map((n) => [n.id, n.badge]));
    expect(d).toEqual({ A: '0', B: '3', C: '2', D: '8', E: '10', F: '13' });
  });

  it('topological sort orders or detects a cycle', () => {
    const order = (last(run('topological-sort')).panels[2] as ListPanel).items;
    const pos = Object.fromEntries(order.map((n, i) => [n, i]));
    for (const [a, b] of [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E'], ['F', 'C'], ['F', 'E']]) expect(pos[a]).toBeLessThan(pos[b]);
    expect(last(run('topological-sort', { edges: 'A B, B C, C A, C D' })).note).toMatch(/cycle/);
  });

  it('union-find merges sets', () => {
    expect(last(run('union-find')).vars.sets).toBe(1);
    expect(() => run('union-find', { ops: 'union 1 99' })).toThrow(/0-8/);
  });

  it('heap pops in ascending order', () => {
    const popped = (last(run('heap')).panels[2] as ListPanel).items;
    expect(popped).toEqual(['3', '8', '11']);
  });

  it('trie finds prefix matches', () => {
    expect(last(run('trie')).note).toMatch(/3 words start with "tra": trail, trap, tram/);
    expect(last(run('trie', { prefix: 'x' })).note).toMatch(/No word starts/);
    expect(last(run('trie', { prefix: 'trai' })).note).toMatch(/1 word starts with "trai": trail/);
  });

  it('n-queens produces a valid board', () => {
    for (const n of [4, 5, 6, 8]) {
      const grid = last(run('n-queens', { n: String(n) })).panels[0] as GridPanel;
      const qs = grid.cells.flatMap((row, r) => row.map((c, col) => (c ? [r, col] : null)).filter(Boolean)) as number[][];
      expect(qs).toHaveLength(n);
      for (const [r1, c1] of qs) for (const [r2, c2] of qs) if (r1 !== r2) {
        expect(c1).not.toBe(c2);
        expect(Math.abs(c1 - c2)).not.toBe(Math.abs(r1 - r2));
      }
    }
  });

  it('dp tables', () => {
    expect(last(run('lcs')).vars).toMatchObject({ length: 3 });
    expect(last(run('lcs', { a: 'abcde', b: 'ace' })).vars).toMatchObject({ length: 3, lcs: 'ACE' });
    expect(last(run('knapsack')).vars).toMatchObject({ best: 10 });
    expect(last(run('coin-change')).vars).toMatchObject({ answer: '3' });
    expect(last(run('coin-change', { coins: '4 6', amount: '7' })).vars).toMatchObject({ answer: '∞' });
  });
});

describe('input validation', () => {
  it.each([
    ['binary-search', { a: '1 2 x' }],
    ['grid-bfs', { grid: 'S..\n.E' }],
    ['grid-bfs', { grid: 'S..' }],
    ['dijkstra', { edges: 'A B x' }],
    ['dijkstra', { start: 'Z' }],
    ['heap', { ops: 'push 5, shove 3' }],
    ['knapsack', { v: '1 2' }],
    ['n-queens', { n: '12' }],
    ['trie', { words: 'ok n0pe' }],
  ])('%s rejects %o', (id, input) => {
    expect(() => run(id, input as Record<string, string>)).toThrow(InputError);
  });
});
