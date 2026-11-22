import type { TestCase } from './types';

// Pure test-running logic. The worker calls this; unit tests call it directly.

export interface CaseResult {
  index: number;
  ok: boolean;
  got?: string;
  error?: string;
  logs: string[];
  ms: number;
}

/** What the worker reports for one case. The page compares `value` with the expected answer, never the worker. */
export interface RawCase {
  index: number;
  value?: unknown;
  got: string;
  error?: string;
  logs: string[];
  ms: number;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && a.length !== (b as unknown[]).length) return false; // holes have no keys
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** JSON-ish, but readable for undefined, NaN, Infinity, functions and cycles. */
export function show(v: unknown, depth = 0): string {
  if (v === undefined) return 'undefined';
  if (typeof v === 'number') return Object.is(v, -0) ? '0' : String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'function') return 'function';
  if (typeof v !== 'object' || v === null) return String(v);
  if (v instanceof Promise) return 'Promise (return the value itself, not a Promise)';
  if (depth > 6) return '…';
  if (Array.isArray(v)) {
    const head = v.slice(0, 50).map((x) => show(x, depth + 1));
    return `[${head.join(', ')}${v.length > 50 ? `, … ${v.length - 50} more` : ''}]`;
  }
  if (v instanceof Map || v instanceof Set) return `${v.constructor.name}(${v.size})`;
  return `{${Object.entries(v).slice(0, 20).map(([k, x]) => `${k}: ${show(x, depth + 1)}`).join(', ')}}`;
}

export function compile(code: string, fn: string): (...args: unknown[]) => unknown {
  if (!/^[A-Za-z_$][\w$]*$/.test(fn)) throw new Error(`Bad function name ${fn}`);
  const factory = new Function(`"use strict";\n${code}\n;return typeof ${fn} === "function" ? ${fn} : undefined;`);
  const f = factory();
  if (typeof f !== 'function') throw new Error(`Define a function named ${fn}.`);
  return f;
}

const MAX_LOGS = 30;

export function runCase(f: (...args: unknown[]) => unknown, args: unknown[], index: number): RawCase {
  const logs: string[] = [];
  const original = console.log;
  console.log = (...parts: unknown[]) => {
    if (logs.length < MAX_LOGS) logs.push(parts.map((p) => (typeof p === 'string' ? p : show(p))).join(' '));
  };
  const t0 = performance.now();
  try {
    const value = f(...structuredClone(args));
    return { index, value, got: show(value), logs, ms: performance.now() - t0 };
  } catch (e) {
    return { index, got: '', error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), logs, ms: performance.now() - t0 };
  } finally {
    console.log = original;
  }
}

const MAX_TEXT = 2000;
export const clip = (s: string) => (s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}… (${s.length - MAX_TEXT} more characters)` : s);

/**
 * Trust boundary: the user's code shares the worker with the reporting code, so it can post
 * any message it likes. Rebuild the result field by field, clip text before it reaches the
 * DOM, and decide pass/fail here against answers the worker never sees.
 */
export function judge(msg: unknown, tests: TestCase[]): CaseResult | null {
  if (typeof msg !== 'object' || msg === null) return null;
  const m = msg as Record<string, unknown>;
  const index = m.index;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= tests.length) return null;
  const error = typeof m.error === 'string' ? clip(m.error) : undefined;
  return {
    index,
    ok: !error && 'value' in m && deepEqual(m.value, tests[index].expected),
    got: typeof m.got === 'string' ? clip(m.got) : '',
    ...(error ? { error } : {}),
    // Not m.logs.slice: a cloned array keeps own properties, so `slice` could be anything.
    logs: Array.isArray(m.logs) ? (Array.prototype.slice.call(m.logs, 0, MAX_LOGS) as unknown[]).filter((l): l is string => typeof l === 'string').map(clip) : [],
    ms: typeof m.ms === 'number' ? m.ms : 0,
  };
}
