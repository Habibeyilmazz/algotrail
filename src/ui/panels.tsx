import gsap from 'gsap';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { ArrayPanel, GraphPanel, GridPanel, ListPanel, Panel, Tone, TreePanel } from '../algos/types';
import { layoutCircle, layoutForest } from '../lib/layout';

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * FLIP: after each render, elements marked data-flip that moved since the last
 * render are tweened from their old spot to the new one. Keys follow values
 * (sorting, heap swaps), so a swap reads as two things trading places.
 */
function useFlip(ref: RefObject<HTMLElement | SVGSVGElement | null>, duration: number) {
  const last = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement | SVGGElement>('[data-flip]');
    const animate = !reducedMotion() && duration > 0;
    const next = new Map<string, DOMRect>();
    els.forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, { x: 0, y: 0 });
      const rect = el.getBoundingClientRect();
      next.set(el.dataset.flip!, rect);
      const prev = last.current.get(el.dataset.flip!);
      if (!animate || !prev) return;
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      // SVG groups need user units; the renderers keep 1 user unit ≈ 1px by sizing the viewBox to the box.
      const scale = el instanceof SVGGElement ? svgScale(el) : 1;
      gsap.fromTo(el, { x: dx * scale, y: dy * scale }, { x: 0, y: 0, duration, ease: 'power2.out' });
    });
    last.current = next;
  });
}

function svgScale(el: SVGGElement) {
  const svg = el.ownerSVGElement;
  if (!svg) return 1;
  const vb = svg.viewBox.baseVal;
  const box = svg.getBoundingClientRect();
  return vb && box.width ? vb.width / box.width : 1;
}

const toneClass = (t: Tone | undefined) => (t ? `tone-${t}` : '');

function ArrayView({ p, duration }: { p: ArrayPanel; duration: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useFlip(ref, duration);
  const max = Math.max(1, ...p.items.map((x) => (typeof x.value === 'number' ? Math.abs(x.value) : 1)));
  const labels = new Map<number, string[]>();
  p.pointers?.forEach((ptr) => labels.set(ptr.index, [...(labels.get(ptr.index) ?? []), ptr.label]));
  if (p.items.length === 0) return <p className="panel-empty">empty</p>;
  return (
    <div ref={ref} className={p.bars ? 'arr arr-bars' : 'arr'} role="list">
      {p.items.map((item, i) => (
        <div key={item.key} data-flip={item.key} className="arr-slot" role="listitem">
          <div
            className={`arr-cell ${toneClass(p.tones?.[i])}`}
            style={p.bars && typeof item.value === 'number' ? { height: `${16 + (item.value / max) * 140}px` } : undefined}
          >
            {item.value}
          </div>
          <div className="arr-ptr">{labels.get(i)?.join(' ') ?? (p.bars ? '' : i)}</div>
        </div>
      ))}
    </div>
  );
}

function GridView({ p }: { p: GridPanel }) {
  const cols = p.cells[0]?.length ?? 0;
  const labelled = Boolean(p.colLabels);
  return (
    <div className={p.board ? 'grid grid-board' : 'grid grid-table'} style={{ gridTemplateColumns: `${p.rowLabels ? 'max-content ' : ''}repeat(${cols}, minmax(0, ${p.board ? '2.6rem' : '2.4rem'}))` }}>
      {labelled && (
        <>
          {p.rowLabels && <span className="grid-label" />}
          {p.colLabels!.map((l, c) => (
            <span key={`c${c}`} className="grid-label">{l}</span>
          ))}
        </>
      )}
      {p.cells.map((row, r) => (
        <div key={r} className="grid-row">
          {p.rowLabels && <span className="grid-label grid-rowlabel">{p.rowLabels[r]}</span>}
          {row.map((v, c) => {
            const wall = p.board && v === '#';
            return (
              <span
                key={c}
                className={`grid-cell ${wall ? 'grid-wall' : ''} ${p.board && (r + c) % 2 ? 'grid-alt' : ''} ${toneClass(p.tones?.[`${r},${c}`])}`}
                role={wall ? 'img' : undefined}
                aria-label={wall ? 'wall' : undefined}
              >
                {wall ? '' : v === '♛' ? <span className="queen" role="img" aria-label="queen">♛</span> : v}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const R = 20;

// Text alternatives so screen readers get the structure, not just a picture.
export function describeGraph(p: GraphPanel) {
  const nodes = p.nodes.map((n) => (n.badge ? `${n.id} (${n.badge})` : n.id)).join(', ');
  const edges = p.edges.map((e) => `${e.from}${p.directed ? ' to ' : '–'}${e.to}${e.weight !== undefined ? ` weight ${e.weight}` : ''}`).join(', ');
  return `${p.directed ? 'Directed graph' : 'Graph'}. Nodes: ${nodes}. Edges: ${edges}.`;
}

export function describeTree(p: TreePanel) {
  const label = new Map(p.nodes.map((n) => [n.id, n.label]));
  const roots = p.nodes.filter((n) => !n.parent).map((n) => n.label);
  const links = p.nodes.filter((n) => n.parent).map((n) => `${label.get(n.parent!)} to ${n.label}`);
  return `Tree. Root${roots.length > 1 ? 's' : ''}: ${roots.join(', ')}.${links.length ? ` Links: ${links.join(', ')}.` : ''}`;
}

function GraphView({ p }: { p: GraphPanel }) {
  const pos = layoutCircle(p.nodes.map((n) => n.id));
  const S = 126; // radius in user units
  const CX = 190;
  const CY = 180;
  const at = (id: string) => ({ x: CX + pos.get(id)!.x * S, y: CY + pos.get(id)!.y * S });
  // Badges sit outside the ring, away from the edges that cross the middle.
  const badgeAt = (id: string) => {
    const p = pos.get(id)!;
    const len = Math.hypot(p.x, p.y) || 1;
    const d = S + R + 14;
    return p.x === 0 && p.y === 0 ? { x: CX, y: CY + R + 13 } : { x: CX + (p.x / len) * d, y: CY + (p.y / len) * d };
  };
  const edgeTone = (a: string, b: string) => p.edgeTones?.[`${a}>${b}`] ?? (p.directed ? undefined : p.edgeTones?.[`${b}>${a}`]);
  return (
    <svg className="graph" viewBox="0 0 380 360" role="img" aria-label={describeGraph(p)}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="arrowhead" />
        </marker>
      </defs>
      {p.edges.map((e, i) => {
        const a = at(e.from);
        const b = at(e.to);
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        const end = p.directed ? R + 3 : R;
        return (
          <g key={i} className={`edge ${toneClass(edgeTone(e.from, e.to))}`}>
            <line x1={a.x + ux * R} y1={a.y + uy * R} x2={b.x - ux * end} y2={b.y - uy * end} markerEnd={p.directed ? 'url(#arrow)' : undefined} />
            {e.weight !== undefined && (
              <text x={(a.x + b.x) / 2 - uy * 10} y={(a.y + b.y) / 2 + ux * 10} className="edge-w">
                {e.weight}
              </text>
            )}
          </g>
        );
      })}
      {p.nodes.map((n) => {
        const { x, y } = at(n.id);
        return (
          <g key={n.id} className={`node ${toneClass(p.nodeTones?.[n.id])}`}>
            <circle cx={x} cy={y} r={R} />
            <text x={x} y={y} className="node-label">{n.label ?? n.id}</text>
            {n.badge && (
              <text x={badgeAt(n.id).x} y={badgeAt(n.id).y} className="node-badge">{n.badge}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function TreeView({ p, duration }: { p: TreePanel; duration: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useFlip(ref, duration);
  if (p.nodes.length === 0) return <p className="panel-empty">empty</p>;
  const pos = layoutForest(p.nodes);
  const xs = [...pos.values()].map((v) => v.x);
  const ys = [...pos.values()].map((v) => v.y);
  const GX = 54;
  const GY = 62;
  const width = (Math.max(...xs) + 1) * GX + 20;
  const height = (Math.max(...ys) + 1) * GY + 10;
  const at = (id: string) => ({ x: 10 + GX / 2 + pos.get(id)!.x * GX, y: 30 + pos.get(id)!.y * GY });
  const byId = new Set(p.nodes.map((n) => n.id));
  return (
    <svg ref={ref} className="tree" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: `${width}px` }} role="img" aria-label={describeTree(p)}>
      {p.nodes.map((n) => {
        if (!n.parent || !byId.has(n.parent)) return null;
        const a = at(n.parent);
        const b = at(n.id);
        return <line key={`e${n.id}`} className="tree-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
      {p.nodes.map((n) => {
        const { x, y } = at(n.id);
        return (
          <g key={n.id} className={`node ${toneClass(p.tones?.[n.id])}`}>
            <g data-flip={n.id}>
              <circle cx={x} cy={y} r={17} />
              <text x={x} y={y} className="node-label">{n.label}</text>
              {n.badge && <text x={x} y={y + 30} className="node-badge">{n.badge}</text>}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function ListView({ p }: { p: ListPanel }) {
  return p.items.length ? (
    <ol className="chips">
      {p.items.map((x, i) => (
        <li key={i} className={`chip ${toneClass(p.tones?.[i])}`}>{x}</li>
      ))}
    </ol>
  ) : (
    <p className="panel-empty">empty</p>
  );
}

export function PanelView({ panel, duration }: { panel: Panel; duration: number }) {
  const body = (() => {
    switch (panel.kind) {
      case 'array':
        return <ArrayView p={panel} duration={duration} />;
      case 'grid':
        return <GridView p={panel} />;
      case 'graph':
        return <GraphView p={panel} />;
      case 'tree':
        return <TreeView p={panel} duration={duration} />;
      case 'list':
        return <ListView p={panel} />;
    }
  })();
  return (
    <figure className={`panel panel-${panel.kind}`}>
      {panel.title && <figcaption>{panel.title}</figcaption>}
      {body}
    </figure>
  );
}
