import { describe, expect, it } from 'vitest';
import { describeGraph, describeTree } from './panels';

describe('text alternatives', () => {
  it('describes a weighted graph', () => {
    expect(describeGraph({ kind: 'graph', directed: false, nodes: [{ id: 'A', badge: '0' }, { id: 'B' }], edges: [{ from: 'A', to: 'B', weight: 4 }] })).toBe(
      'Graph. Nodes: A (0), B. Edges: A–B weight 4.',
    );
  });

  it('describes a forest', () => {
    expect(describeTree({ kind: 'tree', nodes: [{ id: 'a', label: '1', parent: null }, { id: 'b', label: '2', parent: 'a' }, { id: 'c', label: '3', parent: null }] })).toBe(
      'Tree. Roots: 1, 3. Links: 1 to 2.',
    );
  });
});
