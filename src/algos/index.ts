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
