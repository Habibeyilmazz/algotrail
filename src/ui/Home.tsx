import { useMemo } from 'react';
import { ALGOS, algoById, defaults } from '../algos';
import { PATTERNS } from '../drills/patterns';
import { problemsFor, PROBLEMS } from '../drills/problems';
import { href } from '../lib/router';
import { describeDue } from '../lib/srs';
import { useProgress } from '../lib/store';
import { reducedMotion } from './panels';
import { Stage, Transport, usePlayer } from './Player';
import { useNow } from './Review';

function Demo() {
  const algo = algoById('binary-search')!;
  const frames = useMemo(() => algo.run(defaults(algo)), [algo]);
  const player = usePlayer(frames, !reducedMotion());
  return (
    <figure className="demo" aria-label="Binary search, running">
      <Stage frame={player.frame} speed={player.speed} />
      <figcaption className="note">{player.frame.note}</figcaption>
      <Transport player={player} compact />
    </figure>
  );
}

export function HomePage() {
  const { drills, cards } = useProgress();
  const now = useNow();
  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-copy">
          <h1>Watch an algorithm take every step. Then take them yourself.</h1>
          <p className="lede">
            Run {ALGOS.length} classic algorithms on input you choose, one pseudocode line at a time. Practise the patterns behind them with {PROBLEMS.length} short drills, and keep them fresh with spaced review.
          </p>
          <p className="hero-actions">
            <a className="btn primary" href={href.viz('binary-search')}>Open the visualizer</a>
            <a className="btn" href={href.drill(PROBLEMS[0].id)}>Start the first drill</a>
          </p>
        </div>
        <Demo />
      </section>

      <section className="patterns-overview" aria-labelledby="patterns-h">
        <h2 id="patterns-h">Patterns</h2>
        <table className="overview">
          <thead>
            <tr>
              <th scope="col">Pattern</th>
              <th scope="col">Watch</th>
              <th scope="col">Drills solved</th>
              <th scope="col">Review</th>
            </tr>
          </thead>
          <tbody>
            {PATTERNS.map((p) => {
              const list = problemsFor(p.id);
              const solved = list.filter((x) => drills[x.id]?.solved).length;
              return (
                <tr key={p.id}>
                  <th scope="row"><a href={href.pattern(p.id)}>{p.name}</a></th>
                  <td className="watch">
                    {p.visualizers.map((v, k) => (
                      <span key={v}>{k > 0 && ', '}<a href={href.viz(v)}>{algoById(v)?.title}</a></span>
                    ))}
                  </td>
                  <td>
                    <span className="meter" aria-hidden="true"><span style={{ width: `${(solved / list.length) * 100}%` }} /></span>
                    {solved}/{list.length}
                  </td>
                  <td className="muted">{cards[p.id] ? describeDue(cards[p.id], now) : 'not started'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
