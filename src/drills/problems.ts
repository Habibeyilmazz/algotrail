import { BUILD_PROBLEMS } from './problems-build';
import { GRAPH_PROBLEMS } from './problems-graphs';
import { SEARCH_PROBLEMS } from './problems-search';
import type { Problem } from './types';

export const PROBLEMS: Problem[] = [...SEARCH_PROBLEMS, ...GRAPH_PROBLEMS, ...BUILD_PROBLEMS];

export const problemById = (id: string) => PROBLEMS.find((p) => p.id === id);

export const problemsFor = (pattern: string) => PROBLEMS.filter((p) => p.pattern === pattern);

export const starterCode = (p: Problem) => `function ${p.fn}(${p.params}) {\n  \n}\n`;
