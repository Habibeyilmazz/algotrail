/// <reference lib="webworker" />
import { compile, runCase } from './runner';
import type { TestCase } from './types';

// Runs user code off the main thread. The page kills this worker on timeout,
// so an infinite loop never freezes the UI.
self.onmessage = (e: MessageEvent<{ code: string; fn: string; tests: TestCase[] }>) => {
  const { code, fn, tests } = e.data;
  let f;
  try {
    f = compile(code, fn);
  } catch (err) {
    self.postMessage({ type: 'compile-error', message: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
    return;
  }
  tests.forEach((t, i) => self.postMessage({ type: 'case', result: runCase(f, t, i) }));
  self.postMessage({ type: 'done' });
};
