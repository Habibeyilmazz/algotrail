import { clip, judge, type CaseResult } from './runner';
import type { TestCase } from './types';

export type RunOutcome =
  | { kind: 'compile-error'; message: string }
  | { kind: 'results'; results: CaseResult[]; timedOut: boolean };

export const TIME_LIMIT_MS = 3000;
/** How long the worker script may take to download and start before the run gives up on it. */
export const LOAD_LIMIT_MS = 20_000;
const NOT_LOADED = 'The test runner did not load. If you are offline, reconnect and run again.';

export function runInWorker(code: string, fn: string, tests: TestCase[], limit = TIME_LIMIT_MS): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const results: CaseResult[] = [];
    const finish = (outcome: RunOutcome) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(outcome);
    };
    // The time limit starts when the worker says it is ready, so a slow download is not blamed on the code.
    let timer = setTimeout(() => finish({ kind: 'compile-error', message: NOT_LOADED }), LOAD_LIMIT_MS);
    let started = false;
    worker.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg !== 'object' || msg === null) return;
      if (msg.type === 'ready') {
        if (started) return; // only once: user code could post "ready" to push the limit back
        started = true;
        clearTimeout(timer);
        timer = setTimeout(() => finish({ kind: 'results', results, timedOut: true }), limit);
      } else if (msg.type === 'compile-error') {
        finish({ kind: 'compile-error', message: typeof msg.message === 'string' ? clip(msg.message) : 'The code could not be run.' });
      } else if (msg.type === 'case') {
        const r = judge(msg, tests);
        if (r && !results.some((x) => x.index === r.index)) results.push(r);
      } else if (msg.type === 'done') finish({ kind: 'results', results, timedOut: false });
    };
    worker.onerror = (e) => {
      e.preventDefault();
      // An error thrown in the worker has a message; a worker script that failed to load (offline) has none.
      finish({ kind: 'compile-error', message: e.message ? clip(e.message) : NOT_LOADED });
    };
    worker.postMessage({ code, fn, args: tests.map((t) => t.args) });
  });
}
