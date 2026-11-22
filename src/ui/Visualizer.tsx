import { useEffect, useMemo, useState } from 'react';
import { ALGOS, algoById, defaults } from '../algos';
import { InputError, type Algo, type Frame } from '../algos/types';
import { patternById } from '../drills/patterns';
import { href } from '../lib/router';
import { Pseudocode, setSpeed, Stage, Transport, usePlayer, Vars } from './Player';
import { ignoreKey } from './keys';

const GROUPS = [...new Set(ALGOS.map((a) => a.group))];

function compute(algo: Algo, input: Record<string, string>): { frames: Frame[] } | { error: string } {
  try {
    return { frames: algo.run(input) };
  } catch (e) {
    if (e instanceof InputError) return { error: e.message };
    throw e;
  }
}

export function VisualizerPage({ id }: { id: string }) {
  // A bare #/visualize opens the first algorithm; a mistyped id says so instead of silently showing another one.
  const algo = id ? algoById(id) : ALGOS[0];
  return (
    <div className="viz-layout">
      <nav className="viz-nav" aria-label="Algorithms">
        <label className="viz-select">
          <span className="sr-only">Choose an algorithm</span>
          <select value={algo?.id ?? ''} onChange={(e) => (location.hash = href.viz(e.target.value))}>
            {!algo && <option value="" disabled>Choose an algorithm</option>}
            {GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {ALGOS.filter((a) => a.group === g).map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="viz-list">
          {GROUPS.map((g) => (
            <section key={g}>
              <h2>{g}</h2>
              <ul>
                {ALGOS.filter((a) => a.group === g).map((a) => (
                  <li key={a.id}>
                    <a href={href.viz(a.id)} aria-current={a.id === algo?.id ? 'page' : undefined}>{a.title}</a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      {algo ? (
        <Workbench key={algo.id} algo={algo} />
      ) : (
        <article className="workbench">
          <h1>No such visualizer</h1>
          <p className="lede">This link names an algorithm that does not exist. Pick one from the list.</p>
        </article>
      )}
    </div>
  );
}

function Workbench({ algo }: { algo: Algo }) {
  const [draft, setDraft] = useState(() => defaults(algo));
  const [applied, setApplied] = useState(() => defaults(algo));
  const result = useMemo(() => compute(algo, applied), [algo, applied]);
  // Keep showing the last good run while the new input has an error.
  const [lastGood, setLastGood] = useState<Frame[]>(() => ('frames' in result ? result.frames : []));
  const frames = 'frames' in result ? result.frames : lastGood;
  useEffect(() => {
    if ('frames' in result) setLastGood(result.frames);
  }, [result]);
  const player = usePlayer(frames);
  const { frame, toggle, go, i, lastIndex, speed } = player;
  const pattern = patternById(algo.pattern);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreKey(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const actions: Record<string, () => void> = {
        ' ': toggle,
        k: toggle,
        ArrowRight: () => go(i + 1),
        l: () => go(i + 1),
        ArrowLeft: () => go(i - 1),
        j: () => go(i - 1),
        Home: () => go(0),
        End: () => go(lastIndex),
        '+': () => setSpeed(1, speed),
        '=': () => setSpeed(1, speed),
        '-': () => setSpeed(-1, speed),
      };
      const act = actions[e.key];
      if (!act) return;
      // Let Space activate a focused button normally instead of double-firing.
      if (e.key === ' ' && (e.target as HTMLElement).closest('button, a, select')) return;
      // A focused wide table scrolls with the arrow keys, Home and End.
      if (e.key !== ' ' && (e.target as HTMLElement).classList?.contains('grid-table')) return;
      e.preventDefault();
      act();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [toggle, go, i, lastIndex, speed]);

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({ ...draft });
  };
  const reset = () => {
    setDraft(defaults(algo));
    setApplied(defaults(algo));
  };
  const error = 'error' in result ? result.error : null;

  return (
    <article className="workbench">
      <header className="wb-head">
        <div>
          <h1>{algo.title}</h1>
          <p className="lede">{algo.summary}</p>
        </div>
        <p className="wb-meta">
          <span>{algo.complexity}</span>
          {pattern && (
            <a href={href.pattern(pattern.id)}>Practise {pattern.name.toLowerCase()}</a>
          )}
        </p>
      </header>

      <form className="inputs" onSubmit={run} aria-describedby={error ? 'input-error' : undefined}>
        {algo.inputs.map((f) => (
          <label key={f.id} className={f.multiline ? 'field wide' : 'field'}>
            <span>{f.label}</span>
            {f.multiline ? (
              <textarea
                value={draft[f.id]}
                rows={Math.min(6, Math.max(2, draft[f.id].split('\n').length))}
                spellCheck={false}
                onChange={(e) => setDraft({ ...draft, [f.id]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(e);
                }}
              />
            ) : (
              <input value={draft[f.id]} spellCheck={false} autoComplete="off" onChange={(e) => setDraft({ ...draft, [f.id]: e.target.value })} />
            )}
            {f.help && <small>{f.help}</small>}
          </label>
        ))}
        <div className="input-actions">
          <button type="submit" className="btn primary">Visualize</button>
          <button type="button" className="btn" onClick={reset}>Reset example</button>
        </div>
        {error && (
          <p id="input-error" className="input-error" role="alert">{error}</p>
        )}
      </form>

      {frame && (
        <div className="bench">
          <section className="stage" aria-label="Visualization">
            <Stage frame={frame} speed={speed} />
            <p className="note" aria-live="polite">{frame.note}</p>
            <Transport player={player} />
          </section>
          <div className="side">
            <h2 className="side-h">Pseudocode</h2>
            <Pseudocode algo={algo} line={frame.line} />
            <h2 className="side-h">Variables</h2>
            <Vars vars={frame.vars} />
          </div>
        </div>
      )}
    </article>
  );
}
