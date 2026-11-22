import { parseNumber, parseNumbers, recorder } from './parse';
import { InputError, type Algo, type ArrayPanel, type Tone } from './types';

export function boxes(values: (number | string)[], tones: Record<number, Tone> = {}, pointers: ArrayPanel['pointers'] = [], title?: string): ArrayPanel {
  return { kind: 'array', title, items: values.map((value, i) => ({ key: `i${i}`, value })), tones, pointers };
}

function rangeTones(n: number, lo: number, hi: number, inside: Tone | null, outside: Tone | null) {
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < n; i++) {
    const t = i >= lo && i <= hi ? inside : outside;
    if (t) tones[i] = t;
  }
  return tones;
}

export const binarySearch: Algo = {
  id: 'binary-search',
  title: 'Binary search',
  group: 'Arrays',
  pattern: 'binary-search',
  summary: 'Halve a sorted range each step by comparing the middle value with the target.',
  complexity: 'O(log n) time, O(1) space',
  pseudocode: [
    'lo ← 0, hi ← n − 1',
    'while lo ≤ hi:',
    '  mid ← ⌊(lo + hi) / 2⌋',
    '  if a[mid] = target: return mid',
    '  if a[mid] < target: lo ← mid + 1',
    '  else: hi ← mid − 1',
    'return −1',
  ],
  inputs: [
    { id: 'a', label: 'Sorted numbers', initial: '3 8 11 15 19 24 31 37 42 50 58 63' },
    { id: 'target', label: 'Target', initial: '42' },
  ],
  run(input) {
    const a = parseNumbers(input.a, 'Sorted numbers');
    const target = parseNumber(input.target, 'Target', -999, 999);
    for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1]) throw new InputError('Sorted numbers: binary search needs ascending order.');
    const { frames, push } = recorder();
    const n = a.length;
    let lo = 0;
    let hi = n - 1;
    const snap = (line: number, note: string, mid: number | null, found = false) => {
      const tones = rangeTones(n, lo, hi, null, 'muted');
      if (mid !== null) tones[mid] = found ? 'done' : 'active';
      const pointers = [{ index: lo, label: 'lo' }, { index: hi, label: 'hi' }].filter((p) => p.index >= 0 && p.index < n);
      if (mid !== null) pointers.push({ index: mid, label: 'mid' });
      push({ line, note, vars: { target, lo, hi, mid: mid ?? '—' }, panels: [boxes(a, tones, pointers)] });
    };
    snap(0, `Search the whole array for ${target}.`, null);
    while (lo <= hi) {
      snap(1, `${hi - lo + 1} candidate${hi === lo ? '' : 's'} left.`, null);
      const mid = Math.floor((lo + hi) / 2);
      snap(2, `Middle of ${lo}..${hi} is index ${mid}, value ${a[mid]}.`, mid);
      if (a[mid] === target) {
        snap(3, `a[${mid}] = ${target}. Found it.`, mid, true);
        return frames;
      }
      if (a[mid] < target) {
        snap(4, `${a[mid]} < ${target}, so everything left of mid is too small.`, mid);
        lo = mid + 1;
      } else {
        snap(5, `${a[mid]} > ${target}, so everything right of mid is too big.`, mid);
        hi = mid - 1;
      }
    }
    snap(6, `The range is empty: ${target} is not in the array.`, null);
    return frames;
  },
};

export const twoPointers: Algo = {
  id: 'two-pointers',
  title: 'Two pointers',
  group: 'Arrays',
  pattern: 'two-pointers',
  summary: 'Find a pair with a given sum in a sorted array by moving inward from both ends.',
  complexity: 'O(n) time, O(1) space',
  pseudocode: [
    'i ← 0, j ← n − 1',
    'while i < j:',
    '  s ← a[i] + a[j]',
    '  if s = target: return (i, j)',
    '  if s < target: i ← i + 1',
    '  else: j ← j − 1',
    'return none',
  ],
  inputs: [
    { id: 'a', label: 'Sorted numbers', initial: '1 4 6 9 13 17 20 26 30' },
    { id: 'target', label: 'Pair sum', initial: '33' },
  ],
  run(input) {
    const a = parseNumbers(input.a, 'Sorted numbers', { minLen: 2 });
    const target = parseNumber(input.target, 'Pair sum', -1998, 1998);
    for (let k = 1; k < a.length; k++) if (a[k] < a[k - 1]) throw new InputError('Sorted numbers: two pointers needs ascending order.');
    const { frames, push } = recorder();
    let i = 0;
    let j = a.length - 1;
    const snap = (line: number, note: string, s: number | string, tone: Tone = 'active') => {
      const tones = rangeTones(a.length, i, j, null, 'muted');
      tones[i] = tone;
      tones[j] = tone;
      push({ line, note, vars: { target, i, j, sum: s }, panels: [boxes(a, tones, [{ index: i, label: 'i' }, { index: j, label: 'j' }])] });
    };
    snap(0, 'Start with the smallest and largest values.', '—');
    while (i < j) {
      snap(1, 'Pointers have not crossed yet.', '—');
      const s = a[i] + a[j];
      snap(2, `${a[i]} + ${a[j]} = ${s}.`, s, 'compare');
      if (s === target) {
        snap(3, `Sum matches ${target}: pair at (${i}, ${j}).`, s, 'done');
        return frames;
      }
      if (s < target) {
        snap(4, `${s} is too small. Only a bigger left value can help.`, s, 'compare');
        i++;
      } else {
        snap(5, `${s} is too big. Only a smaller right value can help.`, s, 'compare');
        j--;
      }
    }
    snap(6, `Pointers met. No pair sums to ${target}.`, '—', 'muted');
    return frames;
  },
};

export const slidingWindow: Algo = {
  id: 'sliding-window',
  title: 'Sliding window',
  group: 'Arrays',
  pattern: 'sliding-window',
  summary: 'Longest stretch of a string with no repeated letter: grow on the right, jump the left past a repeat.',
  complexity: 'O(n) time, O(k) space for k distinct letters',
  pseudocode: [
    'left ← 0, best ← 0, last ← {}',
    'for right in 0 … n − 1:',
    '  ch ← s[right]',
    '  if last[ch] ≥ left: left ← last[ch] + 1',
    '  last[ch] ← right',
    '  best ← max(best, right − left + 1)',
    'return best',
  ],
  inputs: [{ id: 's', label: 'Text (letters only)', initial: 'trailmarkers' }],
  run(input) {
    const s = input.s.trim();
    if (!/^[a-z]{1,16}$/i.test(s)) throw new InputError('Text: 1-16 letters, no spaces.');
    const chars = [...s];
    const { frames, push } = recorder();
    let left = 0;
    let best = 0;
    let bestAt = 0;
    const last = new Map<string, number>();
    const snap = (line: number, note: string, right: number, extra: Record<number, Tone> = {}) => {
      const tones = right >= 0 ? rangeTones(chars.length, left, right, 'range', null) : {};
      if (right >= 0) tones[right] = 'active';
      Object.assign(tones, extra);
      const pointers = right >= 0 ? [{ index: left, label: 'left' }, { index: right, label: 'right' }] : [];
      const seen = [...last.entries()].map(([c, k]) => `${c}:${k}`).join(' ') || '—';
      push({
        line,
        note,
        vars: { left, right: right < 0 ? '—' : right, best, last: seen },
        panels: [
          boxes(chars, tones, pointers),
          boxes(chars.slice(bestAt, bestAt + best), {}, [], 'Best window so far'),
        ],
      });
    };
    snap(0, 'Empty window.', -1);
    for (let right = 0; right < chars.length; right++) {
      const ch = chars[right];
      snap(2, `Bring "${ch}" into the window.`, right);
      const prev = last.get(ch);
      if (prev !== undefined && prev >= left) {
        snap(3, `"${ch}" already sits at ${prev} inside the window. Move left to ${prev + 1}.`, right, { [prev]: 'bad' });
        left = prev + 1;
      }
      last.set(ch, right);
      if (right - left + 1 > best) {
        best = right - left + 1;
        bestAt = left;
        snap(5, `New best: "${chars.slice(left, right + 1).join('')}" has length ${best}.`, right);
      } else {
        snap(5, `Window length ${right - left + 1} does not beat ${best}.`, right);
      }
    }
    snap(6, `Longest stretch without a repeat has length ${best}.`, -1);
    return frames;
  },
};
