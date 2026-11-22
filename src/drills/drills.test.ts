import { describe, expect, it } from 'vitest';
import { ALGOS } from '../algos';
import { PATTERNS } from './patterns';
import { PROBLEMS, starterCode } from './problems';
import { compile, deepEqual, judge, runCase, show } from './runner';

describe('problem bank', () => {
  it('has about forty problems with unique ids, three hints and four tests each', () => {
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(PROBLEMS.length);
    for (const p of PROBLEMS) {
      expect(p.hints.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.tests.length, p.id).toBeGreaterThanOrEqual(3);
      expect(PATTERNS.some((x) => x.id === p.pattern), p.id).toBe(true);
    }
  });

  it('every pattern has drills and visualizers that exist', () => {
    for (const pat of PATTERNS) {
      expect(PROBLEMS.filter((p) => p.pattern === pat.id).length, pat.id).toBeGreaterThanOrEqual(3);
      for (const v of pat.visualizers) expect(ALGOS.some((a) => a.id === v), v).toBe(true);
    }
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('reference solution for %s passes its tests', (_, p) => {
    const f = compile(p.solution, p.fn);
    for (const [i, t] of p.tests.entries()) {
      const r = judge(runCase(f, t.args, i), p.tests)!;
      expect(r.error, `${p.id} #${i}`).toBeUndefined();
      expect(r.ok, `${p.id} #${i}: got ${r.got}, want ${show(t.expected)}`).toBe(true);
    }
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('starter code for %s compiles and fails', (_, p) => {
    const f = compile(starterCode(p), p.fn);
    expect(p.tests.some((t, i) => !judge(runCase(f, t.args, i), p.tests)!.ok)).toBe(true);
  });
});

describe('runner', () => {
  it('deepEqual compares structure, not identity', () => {
    expect(deepEqual([1, [2, { a: 3 }]], [1, [2, { a: 3 }]])).toBe(true);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual([], new Array(3))).toBe(false);
    expect(deepEqual([1], [1, , ])).toBe(false);
  });

  it('show is readable', () => {
    expect(show([1, 'a', undefined, null])).toBe('[1, "a", undefined, null]');
    expect(show({ x: [1] })).toBe('{x: [1]}');
  });

  it('reports a missing function and syntax errors', () => {
    expect(() => compile('const x = 1;', 'solve')).toThrow(/Define a function named solve/);
    expect(() => compile('function solve( {', 'solve')).toThrow(SyntaxError);
    expect(() => compile('', 'bad name')).toThrow();
  });

  it('captures thrown errors and logs, and does not let tests mutate shared input', () => {
    const f = compile('function f(a) { console.log("seen", a); a.push(9); if (a.length > 3) throw new RangeError("too long"); return a.length; }', 'f');
    const tests = [{ args: [[1, 2]], expected: 3 }, { args: [[1, 2, 3]], expected: 4 }];
    const r = judge(runCase(f, tests[0].args, 0), tests);
    expect(r).toMatchObject({ ok: true, got: '3', logs: ['seen [1, 2]'] });
    expect(tests[0].args).toEqual([[1, 2]]);
    expect(judge(runCase(f, tests[1].args, 1), tests)).toMatchObject({ ok: false, error: 'RangeError: too long' });
  });
});

describe('judge (messages from the worker are untrusted)', () => {
  const tests = [{ args: [1], expected: [1, 2] }, { args: [2], expected: 5 }];

  it('decides pass or fail itself, so a forged ok flag does not count', () => {
    expect(judge({ index: 0, ok: true, got: '[1, 2]', logs: [], ms: 1 }, tests)?.ok).toBe(false);
    expect(judge({ index: 0, value: [1, 2], got: '', logs: [], ms: 1 }, tests)?.ok).toBe(true);
    expect(judge({ index: 1, value: 5, error: 'Error: boom', got: '', logs: [], ms: 1 }, tests)?.ok).toBe(false);
  });

  it('drops malformed messages instead of crashing the page', () => {
    for (const bad of [null, undefined, 7, 'x', [], {}, { index: -1 }, { index: 2 }, { index: 0.5 }, { index: '0' }]) {
      expect(judge(bad, tests)).toBeNull();
    }
    expect(judge({ index: 0, value: [1, 2], got: 42, logs: 'nope', error: {}, ms: 'x' }, tests)).toEqual({ index: 0, ok: true, got: '', logs: [], ms: 0 });
    expect(judge({ index: 0, logs: ['a', 3, null, 'b'] }, tests)?.logs).toEqual(['a', 'b']);
  });

  it('clips long text and caps the log count before it reaches the page', () => {
    const huge = 'x'.repeat(3_000_000);
    const r = judge({ index: 1, value: 0, got: huge, logs: Array(10_000).fill(huge), error: huge }, tests)!;
    expect(r.got!.length).toBeLessThan(2100);
    expect(r.error!.length).toBeLessThan(2100);
    expect(r.error).toMatch(/more characters\)$/);
    expect(r.logs).toHaveLength(30);
    expect(r.logs.every((l) => l.length < 2100)).toBe(true);
  });
});
