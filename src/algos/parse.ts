import { InputError, type Frame } from './types';

// Input parsing is the trust boundary for visualizers: every limit here keeps
// the frame count and the drawing small enough to stay readable.

export function parseNumbers(
  raw: string,
  label: string,
  { min = -999, max = 999, minLen = 1, maxLen = 16 } = {},
): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length < minLen) throw new InputError(`${label}: enter at least ${minLen} number${minLen > 1 ? 's' : ''}.`);
  if (parts.length > maxLen) throw new InputError(`${label}: at most ${maxLen} numbers.`);
  return parts.map((p) => {
    if (!/^-?\d+$/.test(p)) throw new InputError(`${label}: "${p}" is not a whole number.`);
    const n = Number(p);
    if (n < min || n > max) throw new InputError(`${label}: ${n} is outside ${min}..${max}.`);
    return n;
  });
}

export function parseNumber(raw: string, label: string, min: number, max: number): number {
  return parseNumbers(raw, label, { min, max, minLen: 1, maxLen: 1 })[0];
}

export function parseWord(raw: string, label: string, { maxLen = 12, minLen = 1 } = {}): string {
  const w = raw.trim();
  if (w.length < minLen) throw new InputError(`${label}: enter at least ${minLen} character${minLen > 1 ? 's' : ''}.`);
  if (w.length > maxLen) throw new InputError(`${label}: at most ${maxLen} characters.`);
  if (!/^[a-z]*$/i.test(w)) throw new InputError(`${label}: letters only.`);
  return w;
}

export interface ParsedGraph {
  nodes: string[];
  edges: { from: string; to: string; weight: number }[];
}

/** Edges like "A B 4", separated by commas or new lines. Weight defaults to 1. */
export function parseEdges(raw: string, { weighted = false, directed = false, maxNodes = 10, maxEdges = 24 } = {}): ParsedGraph {
  const chunks = raw.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  if (chunks.length === 0) throw new InputError('Edges: enter at least one edge, like "A B".');
  if (chunks.length > maxEdges) throw new InputError(`Edges: at most ${maxEdges} edges.`);
  const nodes: string[] = [];
  const edges: ParsedGraph['edges'] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(/\s+/);
    if (parts.length < 2 || parts.length > (weighted ? 3 : 2)) {
      throw new InputError(`Edges: "${chunk}" should look like ${weighted ? '"A B 4"' : '"A B"'}.`);
    }
    const [from, to, w] = parts;
    for (const id of [from, to]) {
      if (!/^[A-Za-z0-9]{1,3}$/.test(id)) throw new InputError(`Edges: node name "${id}" must be 1-3 letters or digits.`);
      if (!nodes.includes(id)) nodes.push(id);
    }
    if (from === to) throw new InputError(`Edges: "${chunk}" is a self-loop.`);
    // Parallel edges would draw on top of each other and share one colour.
    if (edges.some((e) => (e.from === from && e.to === to) || (!directed && e.from === to && e.to === from))) {
      throw new InputError(`Edges: ${from}–${to} is listed twice.`);
    }
    let weight = 1;
    if (w !== undefined) {
      if (!/^\d+$/.test(w) || Number(w) > 99) throw new InputError(`Edges: weight "${w}" must be a whole number 0-99.`);
      weight = Number(w);
    }
    edges.push({ from, to, weight });
  }
  if (nodes.length > maxNodes) throw new InputError(`Edges: at most ${maxNodes} nodes.`);
  return { nodes, edges };
}

export interface ParsedGrid {
  cells: string[][];
  start: [number, number];
  end: [number, number];
}

/** Rows of ".", "#", "S" and "E". */
export function parseMaze(raw: string, { maxRows = 10, maxCols = 14 } = {}): ParsedGrid {
  const rows = raw.split('\n').map((r) => r.trim()).filter(Boolean);
  if (rows.length === 0) throw new InputError('Grid: draw at least one row.');
  if (rows.length > maxRows) throw new InputError(`Grid: at most ${maxRows} rows.`);
  const width = rows[0].length;
  let start: [number, number] | null = null;
  let end: [number, number] | null = null;
  const cells = rows.map((row, r) => {
    if (row.length !== width) throw new InputError(`Grid: row ${r + 1} has ${row.length} cells, expected ${width}.`);
    if (width > maxCols) throw new InputError(`Grid: at most ${maxCols} columns.`);
    return [...row].map((ch, c) => {
      if (!'.#SE'.includes(ch)) throw new InputError(`Grid: "${ch}" is not allowed; use . # S E.`);
      if (ch === 'S') {
        if (start) throw new InputError('Grid: only one S.');
        start = [r, c];
      }
      if (ch === 'E') {
        if (end) throw new InputError('Grid: only one E.');
        end = [r, c];
      }
      return ch;
    });
  });
  if (!start || !end) throw new InputError('Grid: mark one start S and one end E.');
  return { cells, start, end };
}

export const MAX_FRAMES = 1500;

/** Collects frames and stops runaway inputs before they freeze the page. */
export function recorder() {
  const frames: Frame[] = [];
  return {
    frames,
    push(frame: Frame) {
      if (frames.length >= MAX_FRAMES) throw new InputError('This input needs too many steps to watch. Try a smaller one.');
      frames.push(frame);
    },
  };
}
