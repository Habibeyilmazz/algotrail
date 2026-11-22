import { describe, expect, it } from 'vitest';
import { ALGOS } from '.';
import { InputError } from './types';

// Random edits of each example must either run or fail with a readable InputError, never crash.
const ALPHABET = '0123456789 -,\n.#SEabcxyzAB9';
let seed = 1;
const rand = (n: number) => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed % n;
};
function mutate(s: string) {
  const chars = [...s];
  const edits = 1 + rand(4);
  for (let k = 0; k < edits; k++) {
    const at = rand(chars.length + 1);
    const op = rand(3);
    if (op === 0) chars.splice(at, 1);
    else if (op === 1) chars.splice(at, 0, ALPHABET[rand(ALPHABET.length)]);
    else chars.splice(at, 1, ALPHABET[rand(ALPHABET.length)]);
  }
  return chars.join('');
}

describe('visualizer input fuzz', () => {
  for (const algo of ALGOS) {
    it(algo.id, () => {
      for (let n = 0; n < 400; n++) {
        const input = Object.fromEntries(algo.inputs.map((f) => [f.id, rand(3) ? mutate(f.initial) : f.initial]));
        try {
          const frames = algo.run(input);
          expect(frames.length).toBeGreaterThan(0);
          for (const fr of frames) expect(fr.line).toBeLessThan(algo.pseudocode.length);
        } catch (e) {
          if (!(e instanceof InputError)) throw new Error(`${JSON.stringify(input)} -> ${e}`);
        }
      }
    });
  }
});
