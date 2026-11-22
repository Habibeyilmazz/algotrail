import { parseNumbers, recorder } from './parse';
import type { Algo, ArrayPanel, Tone } from './types';

type Item = { key: string; value: number };

function bars(items: Item[], tones: Record<number, Tone>, pointers: ArrayPanel['pointers'] = [], title?: string): ArrayPanel {
  return { kind: 'array', bars: true, title, items: items.map((x) => ({ ...x })), tones: { ...tones }, pointers };
}

const sortInput = [{ id: 'a', label: 'Numbers (up to 14, 1-99)', initial: '38 12 71 25 90 7 54 33 61 18' }];
const parseSortInput = (raw: string) =>
  parseNumbers(raw, 'Numbers', { min: 1, max: 99, minLen: 2, maxLen: 14 }).map((value, i) => ({ key: `k${i}`, value }));

export const quickSort: Algo = {
  id: 'quick-sort',
  title: 'Quick sort',
  group: 'Sorting',
  pattern: 'sorting',
  summary: 'Partition around a pivot (Lomuto scheme), then sort each side.',
  complexity: 'O(n log n) average, O(n²) worst; O(log n) stack on average',
  pseudocode: [
    'quicksort(lo, hi):',
    '  if lo ≥ hi: return',
    '  pivot ← a[hi], i ← lo',
    '  for j in lo … hi − 1:',
    '    if a[j] < pivot: swap a[i], a[j]; i ← i + 1',
    '  swap a[i], a[hi]',
    '  quicksort(lo, i − 1); quicksort(i + 1, hi)',
  ],
  inputs: sortInput,
  run(input) {
    const a = parseSortInput(input.a);
    const { frames, push } = recorder();
    const done = new Set<number>();
    const swap = (x: number, y: number) => ([a[x], a[y]] = [a[y], a[x]]);
    const snap = (line: number, note: string, vars: Record<string, number | string>, extra: Record<number, Tone> = {}, pointers: ArrayPanel['pointers'] = []) => {
      const tones: Record<number, Tone> = {};
      done.forEach((d) => (tones[d] = 'done'));
      push({ line, note, vars, panels: [bars(a, { ...tones, ...extra }, pointers)] });
    };
    const sort = (lo: number, hi: number) => {
      snap(0, `Sort the slice ${lo}..${hi}.`, { lo, hi }, rangeOf(lo, hi));
      if (lo >= hi) {
        if (lo === hi) done.add(lo);
        snap(1, 'Zero or one element: already sorted.', { lo, hi });
        return;
      }
      const pivot = a[hi].value;
      let i = lo;
      snap(2, `Pivot is the last value, ${pivot}.`, { lo, hi, pivot, i }, { ...rangeOf(lo, hi), [hi]: 'active' }, [{ index: i, label: 'i' }]);
      for (let j = lo; j < hi; j++) {
        const less = a[j].value < pivot;
        snap(3, `Compare ${a[j].value} with pivot ${pivot}.`, { lo, hi, pivot, i, j }, { ...rangeOf(lo, hi), [hi]: 'active', [j]: 'compare' }, [{ index: i, label: 'i' }, { index: j, label: 'j' }]);
        if (less) {
          swap(i, j);
          snap(4, `${a[i].value} < ${pivot}: move it to the left part at ${i}.`, { lo, hi, pivot, i, j }, { ...rangeOf(lo, hi), [hi]: 'active', [i]: 'compare' }, [{ index: i, label: 'i' }, { index: j, label: 'j' }]);
          i++;
        }
      }
      swap(i, hi);
      done.add(i);
      snap(5, `Pivot ${pivot} lands at index ${i}, its final place.`, { lo, hi, pivot, i }, {}, [{ index: i, label: 'i' }]);
      snap(6, `Recurse on ${lo}..${i - 1} and ${i + 1}..${hi}.`, { lo, hi, pivot, i });
      sort(lo, i - 1);
      sort(i + 1, hi);
    };
    sort(0, a.length - 1);
    for (let k = 0; k < a.length; k++) done.add(k);
    snap(0, 'Sorted.', { n: a.length });
    return frames;
  },
};

function rangeOf(lo: number, hi: number): Record<number, Tone> {
  const t: Record<number, Tone> = {};
  for (let k = lo; k <= hi; k++) t[k] = 'range';
  return t;
}

export const mergeSort: Algo = {
  id: 'merge-sort',
  title: 'Merge sort',
  group: 'Sorting',
  pattern: 'sorting',
  summary: 'Split in half, sort each half, then merge the two sorted halves through a buffer.',
  complexity: 'O(n log n) time, O(n) extra space; stable',
  pseudocode: [
    'sort(lo, hi):',
    '  if lo ≥ hi: return',
    '  mid ← ⌊(lo + hi) / 2⌋; sort(lo, mid); sort(mid + 1, hi)',
    '  i ← lo, j ← mid + 1, buf ← []',
    '  while i ≤ mid and j ≤ hi: move smaller of a[i], a[j] to buf',
    '  move the rest of either half to buf',
    '  copy buf back into a[lo … hi]',
  ],
  inputs: sortInput,
  run(input) {
    const a = parseSortInput(input.a);
    const { frames, push } = recorder();
    let buf: Item[] = [];
    const snap = (line: number, note: string, vars: Record<string, number | string>, tones: Record<number, Tone> = {}, pointers: ArrayPanel['pointers'] = []) =>
      push({ line, note, vars, panels: [bars(a, tones, pointers), bars(buf, {}, [], 'Merge buffer')] });

    const sort = (lo: number, hi: number) => {
      snap(0, `Sort ${lo}..${hi}.`, { lo, hi }, rangeOf(lo, hi));
      if (lo >= hi) {
        snap(1, 'One element is already sorted.', { lo, hi }, rangeOf(lo, hi));
        return;
      }
      const mid = Math.floor((lo + hi) / 2);
      snap(2, `Split at ${mid}: ${lo}..${mid} and ${mid + 1}..${hi}.`, { lo, mid, hi }, rangeOf(lo, hi), [{ index: mid, label: 'mid' }]);
      sort(lo, mid);
      sort(mid + 1, hi);
      let i = lo;
      let j = mid + 1;
      buf = [];
      const taken = (): Record<number, Tone> => {
        const t = rangeOf(lo, hi);
        for (let k = lo; k < i; k++) t[k] = 'muted';
        for (let k = mid + 1; k < j; k++) t[k] = 'muted';
        return t;
      };
      snap(3, `Merge ${lo}..${mid} with ${mid + 1}..${hi}.`, { lo, mid, hi, i, j }, taken(), [{ index: i, label: 'i' }, { index: j, label: 'j' }]);
      while (i <= mid && j <= hi) {
        const t = taken();
        t[i] = 'compare';
        t[j] = 'compare';
        const pickLeft = a[i].value <= a[j].value;
        snap(4, `${a[i].value} vs ${a[j].value}: take ${pickLeft ? a[i].value : a[j].value}${a[i].value === a[j].value ? ' (left first keeps it stable)' : ''}.`, { lo, mid, hi, i, j }, t, [{ index: i, label: 'i' }, { index: j, label: 'j' }]);
        buf = [...buf, pickLeft ? a[i++] : a[j++]];
      }
      while (i <= mid) buf = [...buf, a[i++]];
      while (j <= hi) buf = [...buf, a[j++]];
      snap(5, 'One half ran out; the rest of the other is already in order.', { lo, mid, hi }, taken());
      for (let k = 0; k < buf.length; k++) a[lo + k] = buf[k];
      const sortedTones: Record<number, Tone> = {};
      for (let k = lo; k <= hi; k++) sortedTones[k] = 'done';
      buf = [];
      snap(6, `${lo}..${hi} is now sorted.`, { lo, hi }, sortedTones);
    };
    sort(0, a.length - 1);
    return frames;
  },
};
