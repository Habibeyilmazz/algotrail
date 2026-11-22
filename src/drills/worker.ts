/// <reference lib="webworker" />
import { compile, runCase } from './runner';

// Runs user code off the main thread. The page kills this worker on timeout,
// so an infinite loop never freezes the UI. It gets only the arguments: the page
// keeps the expected answers and judges each result itself.
self.onmessage = (e: MessageEvent<{ code: string; fn: string; args: unknown[][] }>) => {
  self.postMessage({ type: 'ready' }); // the page starts the time limit now, not while this script downloads
  const { code, fn, args } = e.data;
  let f;
  try {
    f = compile(code, fn);
  } catch (err) {
    self.postMessage({ type: 'compile-error', message: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
    return;
  }
  args.forEach((a, i) => {
    const raw = runCase(f, a, i);
    try {
      self.postMessage({ type: 'case', ...raw });
    } catch {
      // A function or symbol in the return value cannot be copied to the page; report it as a wrong answer.
      const { value: _, ...rest } = raw;
      self.postMessage({ type: 'case', ...rest });
    }
  });
  self.postMessage({ type: 'done' });
};
