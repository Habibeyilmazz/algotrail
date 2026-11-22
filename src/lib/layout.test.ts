import { describe, expect, it } from 'vitest';
import { layoutCircle, layoutForest } from './layout';

describe('layoutForest', () => {
  it('centres parents over children and spreads leaves', () => {
    const p = layoutForest([
      { id: 'r', parent: null },
      { id: 'a', parent: 'r' },
      { id: 'b', parent: 'r' },
      { id: 'c', parent: 'a' },
    ]);
    expect(p.get('c')).toEqual({ x: 0, y: 2 });
    expect(p.get('a')).toEqual({ x: 0, y: 1 });
    expect(p.get('b')).toEqual({ x: 1, y: 1 });
    expect(p.get('r')).toEqual({ x: 0.5, y: 0 });
  });

  it('lays out a forest side by side and survives a missing parent', () => {
    const p = layoutForest([
      { id: '0', parent: null },
      { id: '1', parent: null },
      { id: '2', parent: 'ghost' },
    ]);
    expect([...p.values()].map((v) => v.x).sort()).toEqual([0, 1, 2]);
  });
});

describe('layoutCircle', () => {
  it('starts at the top', () => {
    const p = layoutCircle(['a', 'b', 'c', 'd']);
    expect(p.get('a')!.y).toBeCloseTo(-1);
    expect(p.get('b')!.x).toBeCloseTo(1);
    expect(layoutCircle(['solo']).get('solo')).toEqual({ x: 0, y: 0 });
  });
});

import { parseHash } from './router';

describe('parseHash', () => {
  it('maps hashes to routes', () => {
    expect(parseHash('')).toEqual({ page: 'home' });
    expect(parseHash('#/visualize/dijkstra')).toEqual({ page: 'viz', id: 'dijkstra' });
    expect(parseHash('#/drills')).toEqual({ page: 'drills' });
    expect(parseHash('#/drills/floor-sqrt')).toEqual({ page: 'drill', id: 'floor-sqrt' });
    expect(parseHash('#/patterns/heap')).toEqual({ page: 'pattern', id: 'heap' });
    expect(parseHash('#/review')).toEqual({ page: 'review' });
    expect(parseHash('#/nowhere')).toEqual({ page: 'home' });
    expect(parseHash('#/drills/%')).toEqual({ page: 'drill', id: '%' }); // malformed escape must not throw
  });
});
