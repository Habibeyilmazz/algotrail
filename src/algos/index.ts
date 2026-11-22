import { binarySearch, slidingWindow, twoPointers } from './arrays';
import { coinChange, knapsack, lcs, nQueens } from './dp';
import { dijkstra, graphBfs, graphDfs, topoSort } from './graphs';
import { gridBfs, gridDfs } from './grids';
import { mergeSort, quickSort } from './sorting';
import { heapOps, trie, unionFind } from './structures';
import type { Algo } from './types';

export const ALGOS: Algo[] = [
  binarySearch, twoPointers, slidingWindow,
  quickSort, mergeSort,
  gridBfs, gridDfs, graphBfs, graphDfs, dijkstra, topoSort,
  unionFind, heapOps, trie,
  nQueens, lcs, knapsack, coinChange,
];

export const algoById = (id: string) => ALGOS.find((a) => a.id === id);

export const defaults = (algo: Algo) => Object.fromEntries(algo.inputs.map((f) => [f.id, f.initial]));

// Share links carry the fields that differ from the example, so a link with no query is the example itself.
export const inputQuery = (algo: Algo, input: Record<string, string>) =>
  new URLSearchParams(algo.inputs.filter((f) => input[f.id] !== f.initial).map((f) => [f.id, input[f.id]])).toString();

// The URL is untrusted: only known fields are read, each clipped, then the parsers in parse.ts validate as for typed input.
// shortcut: 2,000 characters per field is far above every parser's size cap; raise it if a parser allows more.
export const MAX_FIELD = 2000;
export function inputFromQuery(algo: Algo, query: string) {
  const params = new URLSearchParams(query);
  return Object.fromEntries(algo.inputs.map((f) => [f.id, params.get(f.id)?.slice(0, MAX_FIELD) ?? f.initial]));
}

/** 0-based step from a share link's 1-based `step`, or 0. */
export function stepFromQuery(query: string) {
  const n = Number(new URLSearchParams(query).get('step'));
  return Number.isInteger(n) && n > 0 ? n - 1 : 0;
}
