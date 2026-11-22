import type { CaseResult } from './runner';
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
      if (msg.type === 'compile-error') finish({ kind: 'compile-error', message: msg.message });
      else if (msg.type === 'case') results.push(msg.result);
      else if (msg.type === 'done') finish({ kind: 'results', results, timedOut: false });
    };
    worker.onerror = (e) => {
      e.preventDefault();
      finish({ kind: 'compile-error', message: e.message || 'The code could not be run.' });
    };
    worker.postMessage({ code, fn, tests });
  });
}
