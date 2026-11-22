import { parseNumber, recorder } from './parse';
import { InputError, type Algo, type ArrayPanel, type Tone, type TreePanel } from './types';

/** "verb arg arg" commands separated by commas or new lines. */
function parseOps(raw: string, spec: Record<string, number>, maxOps = 14): { op: string; args: string[] }[] {
  const ops = raw.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  if (ops.length === 0) throw new InputError('Operations: enter at least one.');
  if (ops.length > maxOps) throw new InputError(`Operations: at most ${maxOps}.`);
  return ops.map((text) => {
    const [op, ...args] = text.toLowerCase().split(/\s+/);
    if (!(op in spec)) throw new InputError(`Operations: unknown "${op}". Use ${Object.keys(spec).join(' or ')}.`);
    if (args.length !== spec[op]) throw new InputError(`Operations: "${text}" needs ${spec[op]} argument${spec[op] === 1 ? '' : 's'}.`);
    return { op, args };
  });
}

export const unionFind: Algo = {
  id: 'union-find',
  title: 'Union-find',
  group: 'Structures',
  pattern: 'union-find',
  summary: 'Disjoint sets as a forest: union by size keeps trees shallow, path compression flattens them further.',
  complexity: 'Nearly O(1) amortised per operation (inverse Ackermann)',
  pseudocode: [
    'parent[x] ← x, size[x] ← 1 for every x',
    'find(x): follow parent pointers up to the root',
    '  then point every node on that path straight at the root',
    'union(a, b): ra ← find(a), rb ← find(b)',
    '  if ra = rb: already in the same set',
    '  hang the smaller tree under the larger root',
  ],
  inputs: [
    { id: 'n', label: 'Elements (0 … n − 1)', initial: '9' },
    { id: 'ops', label: 'Operations', initial: 'union 0 1, union 2 3, union 1 3, union 4 5, union 6 4, union 7 8, union 5 8, find 3, union 0 6, find 8', multiline: true, help: '"union a b" or "find x", separated by commas.' },
  ],
  run(input) {
    const n = parseNumber(input.n, 'Elements', 2, 12);
    const ops = parseOps(input.ops, { union: 2, find: 1 });
    const el = (s: string) => {
      if (!/^\d+$/.test(s) || Number(s) >= n) throw new InputError(`Operations: element "${s}" must be 0-${n - 1}.`);
      return Number(s);
    };
    const parsed = ops.map(({ op, args }) => ({ op, args: args.map(el) }));
    const { frames, push } = recorder();
    const parent = Array.from({ length: n }, (_, i) => i);
    const size = Array(n).fill(1);
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<number, Tone> = {}) => {
      const tree: TreePanel = {
        kind: 'tree',
        title: 'Forest',
        nodes: parent.map((p, i) => ({ id: String(i), label: String(i), parent: p === i ? null : String(p), badge: p === i ? `size ${size[i]}` : undefined })),
        tones: Object.fromEntries(Object.entries(tones).map(([k, t]) => [k, t])),
      };
      const arr: ArrayPanel = { kind: 'array', title: 'parent[]', items: parent.map((p, i) => ({ key: `i${i}`, value: p })), tones, pointers: parent.map((_, i) => ({ index: i, label: String(i) })) };
      push({ line, note, vars, panels: [tree, arr] });
    };
    const find = (x: number, vars: Record<string, string | number>) => {
      const path = [x];
      while (parent[path[path.length - 1]] !== path[path.length - 1]) path.push(parent[path[path.length - 1]]);
      const root = path[path.length - 1];
      snap(1, `find(${x}): ${path.join(' → ')}. Root is ${root}.`, vars, Object.fromEntries(path.map((p) => [p, p === root ? 'active' : 'compare'])));
      const moved = path.slice(0, -2);
      if (moved.length) {
        moved.forEach((p) => (parent[p] = root));
        snap(2, `Path compression: ${moved.join(', ')} now point${moved.length === 1 ? 's' : ''} at ${root}.`, vars, Object.fromEntries(moved.map((p) => [p, 'path'])));
      }
      return root;
    };
    snap(0, `${n} elements, each in its own set.`, { sets: n });
    let sets = n;
    for (const { op, args } of parsed) {
      if (op === 'find') {
        const root = find(args[0], { op: `find ${args[0]}`, sets });
        snap(1, `${args[0]} belongs to the set rooted at ${root}.`, { op: `find ${args[0]}`, root, sets }, { [root]: 'done' });
        continue;
      }
      const [a, b] = args;
      const vars = { op: `union ${a} ${b}`, sets };
      snap(3, `union(${a}, ${b}): find both roots.`, vars, { [a]: 'active', [b]: 'active' });
      const ra = find(a, vars);
      const rb = find(b, vars);
      if (ra === rb) {
        snap(4, `${a} and ${b} already share root ${ra}. Nothing to do.`, vars, { [ra]: 'done' });
        continue;
      }
      const [big, small] = size[ra] >= size[rb] ? [ra, rb] : [rb, ra];
      parent[small] = big;
      size[big] += size[small];
      sets--;
      snap(5, `Hang root ${small} (size ${size[small]}) under root ${big}, which now holds ${size[big]}.`, { ...vars, sets }, { [big]: 'done', [small]: 'path' });
    }
    return frames;
  },
};

export const heapOps: Algo = {
  id: 'heap',
  title: 'Binary heap',
  group: 'Structures',
  pattern: 'heap',
  summary: 'A min-heap stored in an array: children of i live at 2i + 1 and 2i + 2.',
  complexity: 'O(log n) push and pop, O(1) peek',
  pseudocode: [
    'push(x): append x at the end',
    '  while x < parent(x): swap them (sift up)',
    'pop(): the root is the smallest; take it',
    '  move the last element to the root',
    '  while it is bigger than its smaller child: swap down',
  ],
  inputs: [{ id: 'ops', label: 'Operations', initial: 'push 42, push 17, push 30, push 8, push 25, push 3, push 19, pop, push 11, pop, pop', multiline: true, help: '"push x" (0-99) or "pop", separated by commas.' }],
  run(input) {
    const ops = parseOps(input.ops, { push: 1, pop: 0 }, 16);
    const { frames, push } = recorder();
    const h: { key: string; value: number }[] = [];
    const out: number[] = [];
    let made = 0;
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<number, Tone> = {}) => {
      const tree: TreePanel = {
        kind: 'tree',
        nodes: h.map((x, i) => ({ id: x.key, label: String(x.value), parent: i === 0 ? null : h[(i - 1) >> 1].key })),
        tones: Object.fromEntries(Object.entries(tones).map(([i, t]) => [h[Number(i)]?.key ?? '', t])),
      };
      const arr: ArrayPanel = { kind: 'array', title: 'Backing array', items: h.map((x) => ({ ...x })), tones, pointers: h.map((_, i) => ({ index: i, label: String(i) })) };
      push({ line, note, vars: { size: h.length, ...vars }, panels: [tree, arr, { kind: 'list', title: 'Popped so far', items: out.map(String) }] });
    };
    const swap = (i: number, j: number) => ([h[i], h[j]] = [h[j], h[i]]);
    snap(0, 'Empty heap.', {});
    for (const { op, args } of ops) {
      if (op === 'push') {
        const x = parseNumber(args[0], 'push value', 0, 99);
        h.push({ key: `h${made++}`, value: x });
        let i = h.length - 1;
        snap(0, `Append ${x} at index ${i}.`, { op: `push ${x}` }, { [i]: 'active' });
        while (i > 0 && h[i].value < h[(i - 1) >> 1].value) {
          const p = (i - 1) >> 1;
          snap(1, `${h[i].value} < parent ${h[p].value}: swap up.`, { op: `push ${x}`, i, parent: p }, { [i]: 'active', [p]: 'compare' });
          swap(i, p);
          i = p;
        }
        snap(1, i === 0 ? `${x} is the new root.` : `${x} ≥ its parent ${h[(i - 1) >> 1].value}. Heap order holds.`, { op: `push ${x}` }, { [i]: 'done' });
        continue;
      }
      if (h.length === 0) {
        snap(2, 'pop on an empty heap: nothing to take.', { op: 'pop' });
        continue;
      }
      const top = h[0].value;
      snap(2, `The root ${top} is the smallest value.`, { op: 'pop' }, { 0: 'done' });
      out.push(top);
      const last = h.pop()!;
      if (h.length === 0) {
        snap(3, `Took ${top}; the heap is now empty.`, { op: 'pop' });
        continue;
      }
      h[0] = last;
      snap(3, `Took ${top}. Move the last value ${last.value} to the root.`, { op: 'pop' }, { 0: 'active' });
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < h.length && h[l].value < h[m].value) m = l;
        if (r < h.length && h[r].value < h[m].value) m = r;
        if (m === i) break;
        snap(4, `${h[i].value} > smaller child ${h[m].value}: swap down.`, { op: 'pop', i, child: m }, { [i]: 'active', [m]: 'compare' });
        swap(i, m);
        i = m;
      }
      snap(4, `${h[i].value} is no bigger than its children. Heap order holds.`, { op: 'pop' }, { [i]: 'done' });
    }
    return frames;
  },
};

export const trie: Algo = {
  id: 'trie',
  title: 'Trie',
  group: 'Structures',
  pattern: 'trie',
  summary: 'A prefix tree: words that share a prefix share the path that spells it.',
  complexity: 'O(L) per insert or lookup for a word of length L',
  pseudocode: [
    'insert(word): node ← root',
    '  for each letter c: if node has no child c: create it',
    '    node ← node.child[c]',
    '  mark node as the end of a word',
    'startsWith(prefix): walk its letters from the root',
    '  if a letter is missing: no word has this prefix',
    '  otherwise every word below this node matches',
  ],
  inputs: [
    { id: 'words', label: 'Words to insert', initial: 'trail trap tram tree trek ridge rim', help: 'Up to 10 lowercase words, 1-8 letters each.' },
    { id: 'prefix', label: 'Prefix to look up', initial: 'tra' },
  ],
  run(input) {
    const words = input.words.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (words.length === 0 || words.length > 10) throw new InputError('Words: enter 1-10 words.');
    for (const w of words) if (!/^[a-z]{1,8}$/.test(w)) throw new InputError(`Words: "${w}" must be 1-8 letters a-z.`);
    const prefix = input.prefix.trim().toLowerCase();
    if (!/^[a-z]{0,8}$/.test(prefix)) throw new InputError('Prefix: up to 8 letters a-z.');
    const { frames, push } = recorder();
    const nodes = new Map<string, boolean>([['', false]]); // path -> isEnd
    const snap = (line: number, note: string, vars: Record<string, string | number>, tones: Record<string, Tone> = {}) => {
      push({
        line,
        note,
        vars,
        panels: [
          {
            kind: 'tree',
            nodes: [...nodes].map(([id, end]) => ({ id: `n${id}`, label: id === '' ? '·' : id[id.length - 1], parent: id === '' ? null : `n${id.slice(0, -1)}`, badge: end ? 'end' : undefined })),
            tones: Object.fromEntries(Object.entries(tones).map(([k, t]) => [`n${k}`, t])),
          },
        ],
      });
    };
    snap(0, 'Start with an empty root.', { words: 0 });
    words.forEach((word, wi) => {
      for (let i = 1; i <= word.length; i++) {
        const p = word.slice(0, i);
        const isNew = !nodes.has(p);
        if (isNew) nodes.set(p, false);
        snap(isNew ? 1 : 2, isNew ? `"${p}" is new: create "${word[i - 1]}".` : `"${p}" already exists: follow it.`, { word, letter: word[i - 1], words: wi }, { [p]: isNew ? 'active' : 'compare' });
      }
      nodes.set(word, true);
      snap(3, `Mark the end of "${word}".`, { word, words: wi + 1 }, { [word]: 'done' });
    });
    for (let i = 1; i <= prefix.length; i++) {
      const p = prefix.slice(0, i);
      if (!nodes.has(p)) {
        snap(5, `No child "${prefix[i - 1]}" after "${p.slice(0, -1)}". No word starts with "${prefix}".`, { prefix, matches: 0 }, { [p.slice(0, -1)]: 'bad' });
        return frames;
      }
      snap(4, `Walk "${p}".`, { prefix }, { [p]: 'active' });
    }
    const matches = [...nodes].filter(([id, end]) => end && id.startsWith(prefix)).map(([id]) => id);
    const tones: Record<string, Tone> = {};
    nodes.forEach((_, id) => id.startsWith(prefix) && (tones[id] = 'path'));
    snap(6, `${matches.length} word${matches.length === 1 ? '' : 's'} start with "${prefix}": ${matches.join(', ') || 'none'}.`, { prefix, matches: matches.length }, tones);
    return frames;
  },
};
