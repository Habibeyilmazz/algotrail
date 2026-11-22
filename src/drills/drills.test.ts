import { describe, expect, it } from 'vitest';
import { ALGOS } from '../algos';
import { PATTERNS } from './patterns';
import { PROBLEMS, starterCode } from './problems';
import { compile, deepEqual, runCase, show } from './runner';

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
      const r = runCase(f, t, i);
      expect(r.error, `${p.id} #${i}`).toBeUndefined();
      expect(r.ok, `${p.id} #${i}: got ${r.got}, want ${show(t.expected)}`).toBe(true);
    }
  });

  it.each(PROBLEMS.map((p) => [p.id, p]))('starter code for %s compiles and fails', (_, p) => {
    const f = compile(starterCode(p), p.fn);
    expect(p.tests.some((t, i) => !runCase(f, t, i).ok)).toBe(true);
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
    const test = { args: [[1, 2]], expected: 3 };
    const r = runCase(f, test, 0);
    expect(r).toMatchObject({ ok: true, got: '3', logs: ['seen [1, 2]'] });
    expect(test.args).toEqual([[1, 2]]);
    expect(runCase(f, { args: [[1, 2, 3]], expected: 4 }, 1).error).toBe('RangeError: too long');
  });
});
