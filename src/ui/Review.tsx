import { useEffect, useState } from 'react';
import { algoById } from '../algos';
import { PATTERNS, patternById } from '../drills/patterns';
import { href } from '../lib/router';
import { describeDue, GRADES, isDue, review, type Grade } from '../lib/srs';
import { update, useProgress } from '../lib/store';
import { addToReview } from './Drills';
import { isTyping } from './keys';

/** Re-renders every so often so "due" labels move on; returns the time of this render. */
export function useNow(everyMs = 30_000) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return Date.now();
}

export function ReviewPage() {
  const { cards } = useProgress();
  const now = useNow();
  const [revealed, setRevealed] = useState(false);
  const due = Object.entries(cards)
    .filter(([, c]) => isDue(c, now))
    .sort((a, b) => a[1].due - b[1].due);
  const current = due[0] ? patternById(due[0][0]) : undefined;

  const grade = (g: Grade) => {
    if (!current) return;
    const t = Date.now();
    update((s) => ({ ...s, cards: { ...s.cards, [current.id]: review(s.cards[current.id], g, t) } }));
    setRevealed(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || !current) return;
      if (e.key === ' ' && !revealed && !(e.target as HTMLElement).closest('button, a')) {
        e.preventDefault();
        setRevealed(true);
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g && revealed) {
        e.preventDefault();
        grade(g.grade);
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const inDeck = PATTERNS.filter((p) => cards[p.id]);
  const notInDeck = PATTERNS.filter((p) => !cards[p.id]);

  return (
    <div className="page review-page">
      <header className="page-head">
        <h1>Review</h1>
        <p className="lede">
          Recall each pattern from memory, then check yourself. The schedule (SM-2) spaces out the patterns you know and brings back the ones you miss.
        </p>
      </header>

      {current ? (
        <section className="flash" aria-label="Review card">
          <p className="flash-count">{due.length} due</p>
          <h2 className="flash-name">{current.name}</h2>
          <p className="flash-q">Say it out loud or jot it down: when do you reach for it, what is the one idea to hold on to, and what does the loop look like?</p>
          {revealed ? (
            <>
              <div className="flash-answer">
                <h3>Signals</h3>
                <ul className="signals">{current.signals.map((s) => <li key={s}>{s}</li>)}</ul>
                <h3>Core idea</h3>
                <p>{current.core}</p>
                <h3>Template</h3>
                <pre className="code-block"><code>{current.template}</code></pre>
                <p className="muted">
                  Rewatch: {current.visualizers.map((v, k) => (
                    <span key={v}>{k > 0 && ', '}<a href={href.viz(v)}>{algoById(v)?.title}</a></span>
                  ))}
                </p>
              </div>
              <div className="grades" role="group" aria-label="How well did you recall it?">
                {GRADES.map((g) => (
                  <button key={g.grade} type="button" className={`btn grade grade-${g.grade}`} onClick={() => grade(g.grade)}>
                    {g.label} <kbd>{g.key}</kbd>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="btn primary" onClick={() => setRevealed(true)}>
              Show answer <kbd>Space</kbd>
            </button>
          )}
        </section>
      ) : (
        <section className="flash flash-empty">
          <h2>Nothing due right now</h2>
          <p>
            {inDeck.length
              ? `Next up: ${patternById(Object.entries(cards).sort((a, b) => a[1].due - b[1].due)[0][0])?.name}, ${describeDue(Object.values(cards).sort((a, b) => a.due - b.due)[0], now)}.`
              : 'Your deck is empty. Solve a drill to add its pattern, or add patterns below.'}
          </p>
        </section>
      )}

      <div className="deck-columns">
        {inDeck.length > 0 && (
          <section>
            <h2>In your deck</h2>
            <table className="deck">
              <thead>
                <tr><th scope="col">Pattern</th><th scope="col">Next review</th><th scope="col">Streak</th></tr>
              </thead>
              <tbody>
                {inDeck.map((p) => (
                  <tr key={p.id}>
                    <th scope="row"><a href={href.pattern(p.id)}>{p.name}</a></th>
                    <td>{describeDue(cards[p.id], now)}</td>
                    <td>{cards[p.id].reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {notInDeck.length > 0 && (
          <section>
            <h2>Not in your deck</h2>
            <ul className="add-list">
              {notInDeck.map((p) => (
                <li key={p.id}>
                  <a href={href.pattern(p.id)}>{p.name}</a>
                  <button type="button" className="btn small ghost" onClick={() => addToReview(p.id)} aria-label={`Add ${p.name} to review`}>Add</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
