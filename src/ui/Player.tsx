import { useCallback, useEffect, useState } from 'react';
import type { Algo, Frame } from '../algos/types';
import { SPEEDS, update, useProgress } from '../lib/store';
import { PanelView } from './panels';

const BASE_MS = 900;

export function usePlayer(frames: Frame[], autoplay = false) {
  const { speed } = useProgress();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const lastIndex = frames.length - 1;

  useEffect(() => {
    setI(0);
  }, [frames]);

  useEffect(() => {
    if (!playing) return;
    if (i >= lastIndex) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setI((x) => Math.min(x + 1, lastIndex)), BASE_MS / speed);
    return () => clearTimeout(t);
  }, [playing, i, lastIndex, speed]);

  const go = useCallback((n: number) => {
    setPlaying(false);
    setI(Math.max(0, Math.min(lastIndex, n)));
  }, [lastIndex]);

  const toggle = useCallback(() => {
    if (i >= lastIndex) {
      setI(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  }, [i, lastIndex]);

  return { i, frame: frames[Math.min(i, lastIndex)], playing, toggle, go, speed, lastIndex };
}

export function setSpeed(dir: 1 | -1, current: number) {
  const k = SPEEDS.indexOf(current);
  const next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, k + dir))];
  update((s) => ({ ...s, speed: next }));
}

export function Stage({ frame, speed }: { frame: Frame; speed: number }) {
  const duration = Math.min(0.45, 0.6 / speed);
  return (
    <div className="stage-panels">
      {frame.panels.map((p, k) => (
        <PanelView key={k} panel={p} duration={duration} />
      ))}
    </div>
  );
}

export function Pseudocode({ algo, line }: { algo: Algo; line: number }) {
  return (
    <ol className="pseudo" aria-label="Pseudocode">
      {algo.pseudocode.map((text, k) => (
        <li key={k} className={k === line ? 'current' : ''} aria-current={k === line ? 'step' : undefined}>
          <span className="pseudo-n">{k + 1}</span>
          {/* Leading spaces become padding, so a wrapped line stays under its own indent (plus a 2ch hang). */}
          <code style={{ paddingLeft: `${text.length - text.trimStart().length + 2}ch` }}>{text.trimStart()}</code>
        </li>
      ))}
    </ol>
  );
}

export function Vars({ vars }: { vars: Frame['vars'] }) {
  const entries = Object.entries(vars);
  if (!entries.length) return <p className="vars-none">None yet at this step.</p>;
  return (
    <dl className="vars">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

type Player = ReturnType<typeof usePlayer>;

export function Transport({ player, compact = false }: { player: Player; compact?: boolean }) {
  const { i, lastIndex, playing, toggle, go, speed } = player;
  return (
    <div className="transport">
      <div className="transport-buttons">
        {!compact && (
          <button type="button" className="icon-btn" onClick={() => go(0)} aria-label="First step" title="First step (Home)">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4v12M15 4L7 10l8 6z" /></svg>
          </button>
        )}
        <button type="button" className="icon-btn" onClick={() => go(i - 1)} aria-label="Step back" title="Step back (←)">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4L5 10l8 6z" /></svg>
        </button>
        <button type="button" className="icon-btn play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title="Play or pause (Space)">
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zM11 4h3v12h-3z" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" /></svg>
          )}
        </button>
        <button type="button" className="icon-btn" onClick={() => go(i + 1)} aria-label="Step forward" title="Step forward (→)">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l8 6-8 6z" /></svg>
        </button>
        {!compact && (
          <button type="button" className="icon-btn" onClick={() => go(lastIndex)} aria-label="Last step" title="Last step (End)">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 4v12M5 4l8 6-8 6z" /></svg>
          </button>
        )}
      </div>
      <label className="scrub">
        <span className="sr-only">Step</span>
        <input
          type="range"
          min={0}
          max={lastIndex}
          value={i}
          aria-valuetext={`Step ${i + 1} of ${lastIndex + 1}`}
          onChange={(e) => go(Number(e.target.value))}
          style={{ '--fill': `${lastIndex ? (i / lastIndex) * 100 : 100}%` } as React.CSSProperties}
        />
      </label>
      <span className="step-count" aria-live="off">
        {i + 1}<span className="of">/{lastIndex + 1}</span>
      </span>
      {!compact && (
        <div className="speed" role="group" aria-label="Speed">
          <button type="button" className="icon-btn small" onClick={() => setSpeed(-1, speed)} aria-label="Slower" title="Slower (−)">−</button>
          <span className="speed-val">{speed}×</span>
          <button type="button" className="icon-btn small" onClick={() => setSpeed(1, speed)} aria-label="Faster" title="Faster (+)">+</button>
        </div>
      )}
    </div>
  );
}
