// A visualizer turns user input into a list of frames. The player only indexes
// into that list, so stepping back is free and every frame is testable.

export type Tone = 'active' | 'compare' | 'done' | 'muted' | 'bad' | 'path' | 'range';

export interface ArrayPanel {
  kind: 'array';
  title?: string;
  items: { key: string; value: number | string }[];
  tones?: Record<number, Tone>;
  pointers?: { index: number; label: string }[];
  /** Draw values as bars (sorting) instead of boxes. */
  bars?: boolean;
}

export interface GridPanel {
  kind: 'grid';
  title?: string;
  cells: string[][];
  tones?: Record<string, Tone>; // key "r,c"
  rowLabels?: string[];
  colLabels?: string[];
  /** Square board look (N-Queens, mazes) vs table look (DP). */
  board?: boolean;
}

export interface GraphPanel {
  kind: 'graph';
  title?: string;
  nodes: { id: string; label?: string; badge?: string }[];
  edges: { from: string; to: string; weight?: number }[];
  directed: boolean;
  nodeTones?: Record<string, Tone>;
  edgeTones?: Record<string, Tone>; // key "from>to"
}

export interface TreePanel {
  kind: 'tree';
  title?: string;
  /** parent === null marks a root; several roots draw a forest. */
  nodes: { id: string; label: string; parent: string | null; badge?: string }[];
  tones?: Record<string, Tone>;
}

export interface ListPanel {
  kind: 'list';
  title: string;
  items: string[];
  tones?: Record<number, Tone>;
}

export type Panel = ArrayPanel | GridPanel | GraphPanel | TreePanel | ListPanel;

export interface Frame {
  /** 0-based index into the algorithm's pseudocode. */
  line: number;
  note: string;
  vars: Record<string, string | number | boolean>;
  panels: Panel[];
}

export interface InputField {
  id: string;
  label: string;
  initial: string;
  multiline?: boolean;
  help?: string;
}

export interface Algo {
  id: string;
  title: string;
  group: string;
  /** Drill pattern id this visualizer teaches. */
  pattern: string;
  summary: string;
  complexity: string;
  pseudocode: string[];
  inputs: InputField[];
  /** Throws InputError with a readable message on bad input. */
  run(input: Record<string, string>): Frame[];
}

export class InputError extends Error {}
