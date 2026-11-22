import { clip, judge, type CaseResult } from './runner';
import type { TestCase } from './types';

export type RunOutcome =
  | { kind: 'compile-error'; message: string }
  | { kind: 'results'; results: CaseResult[]; timedOut: boolean };

export const TIME_LIMIT_MS = 3000;

export function runInWorker(code: string, fn: string, tests: TestCase[], limit = TIME_LIMIT_MS): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const results: CaseResult[] = [];
    const finish = (outcome: RunOutcome) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ kind: 'results', results, timedOut: true }), limit);
    worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg !== 'object' || msg === null) return;
      if (msg.type === 'compile-error') {
        finish({ kind: 'compile-error', message: typeof msg.message === 'string' ? clip(msg.message) : 'The code could not be run.' });
      } else if (msg.type === 'case') {
        const r = judge(msg, tests);
        if (r && !results.some((x) => x.index === r.index)) results.push(r);
      } else if (msg.type === 'done') finish({ kind: 'results', results, timedOut: false });
    };
    worker.onerror = (e) => {
      e.preventDefault();
      // An error thrown in the worker has a message; a worker script that failed to load (offline) has none.
      finish({ kind: 'compile-error', message: e.message ? clip(e.message) : 'The test runner did not load. If you are offline, reconnect and run again.' });
    };
    worker.postMessage({ code, fn, args: tests.map((t) => t.args) });
  });
}
