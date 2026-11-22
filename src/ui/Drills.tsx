import { useEffect, useRef, useState } from 'react';
import { algoById } from '../algos';
import { PATTERNS, patternById, type Pattern } from '../drills/patterns';
import { problemById, problemsFor, starterCode, PROBLEMS } from '../drills/problems';
import { show } from '../drills/runner';
import { runInWorker, TIME_LIMIT_MS, type RunOutcome } from '../drills/runInWorker';
import type { Problem } from '../drills/types';
import { href } from '../lib/router';
import { describeDue, newCard } from '../lib/srs';
import { getProgress as progressNow, update, updateDrill, useProgress } from '../lib/store';
import { CodeEditor } from './CodeEditor';
import { ignoreKey } from './keys';

export function Inline({ text }: { text: string }) {
  // `code` spans only; everything else is plain text (no HTML injection).
  return (
    <>
      {text.split('`').map((part, k) => (k % 2 ? <code key={k}>{part}</code> : <span key={k}>{part}</span>))}
    </>
  );
}

export function addToReview(patternId: string, delayDays = 0) {
  update((s) => (s.cards[patternId] ? s : { ...s, cards: { ...s.cards, [patternId]: newCard(Date.now() + delayDays * 86_400_000) } }));
}

function SolvedMark({ solved }: { solved: boolean }) {
  return solved ? (
    <svg className="solved-mark" viewBox="0 0 16 16" role="img" aria-label="Solved"><path d="M3 8.5l3 3 7-7" /></svg>
  ) : (
    <span className="unsolved-mark" aria-hidden="true" />
  );
}

function PatternDrills({ pattern }: { pattern: Pattern }) {
  const { drills } = useProgress();
  return (
    <ul className="drill-list">
      {problemsFor(pattern.id).map((p) => (
        <li key={p.id}>
          <a href={href.drill(p.id)}>
            <SolvedMark solved={!!drills[p.id]?.solved} />
            <span className="drill-title">{p.title}</span>
            <code className="drill-fn">{p.fn}</code>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DrillsPage() {
  const { drills } = useProgress();
  const solved = PROBLEMS.filter((p) => drills[p.id]?.solved).length;
  return (
    <div className="page">
      <header className="page-head">
        <h1>Pattern drills</h1>
        <p className="lede">
          {PROBLEMS.length} short problems in {PATTERNS.length} patterns. Write a JavaScript function, run the tests, climb the hints only when stuck. {solved > 0 && `You have solved ${solved}.`}
        </p>
      </header>
      <div className="pattern-columns">
        {PATTERNS.map((pat) => {
          const list = problemsFor(pat.id);
          const done = list.filter((p) => drills[p.id]?.solved).length;
          return (
            <section key={pat.id} className="pattern-block">
              <h2>
                <a href={href.pattern(pat.id)}>{pat.name}</a>
                <span className="count">{done}/{list.length}</span>
              </h2>
              <PatternDrills pattern={pat} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function PatternPage({ id }: { id: string }) {
  const pattern = patternById(id);
  const { cards } = useProgress();
  if (!pattern) return <NotFound what="pattern" />;
  const card = cards[pattern.id];
  return (
    <div className="page pattern-page">
      <header className="page-head">
        <p className="crumb"><a href={href.drills}>Drills</a></p>
        <h1>{pattern.name}</h1>
        <p className="lede">{pattern.core}</p>
      </header>
      <div className="pattern-grid">
        <section>
          <h2>Reach for it when</h2>
          <ul className="signals">
            {pattern.signals.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <h2>Shape of the code</h2>
          <pre className="code-block" tabIndex={0}><code>{pattern.template}</code></pre>
          <h2>Watch it run</h2>
          <ul className="link-list">
            {pattern.visualizers.map((v) => (
              <li key={v}><a href={href.viz(v)}>{algoById(v)?.title}</a></li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Drills</h2>
          <PatternDrills pattern={pattern} />
          <h2>Review</h2>
          {card ? (
            <p>In your review deck, next review {describeDue(card, Date.now())}.</p>
          ) : (
            <>
              <p>Not in your review deck yet. It is added when you solve a drill here.</p>
              <button type="button" className="btn small" onClick={() => addToReview(pattern.id)}>Add it now</button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <div className="page">
      <h1>No such {what}</h1>
      <p><a href={href.home}>Go to the start page</a></p>
    </div>
  );
}

export function DrillPage({ id }: { id: string }) {
  const problem = problemById(id);
  if (!problem) return <NotFound what="drill" />;
  return <Drill key={problem.id} problem={problem} />;
}

function callText(p: Problem, args: unknown[]) {
  return `${p.fn}(${args.map((a) => show(a)).join(', ')})`;
}

function Drill({ problem: p }: { problem: Problem }) {
  const progress = useProgress();
  const state = progress.drills[p.id] ?? { solved: false, hints: 0, revealed: false, attempts: 0 };
  const [code, setCode] = useState(state.code ?? starterCode(p));
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pattern = patternById(p.pattern)!;
  const list = problemsFor(p.pattern);
  const next = list[list.indexOf(p) + 1];

  // Save the draft shortly after typing stops, and whatever is left when leaving the page.
  const latest = useRef(code);
  latest.current = code;
  const saved = useRef(state.code ?? starterCode(p));
  const save = (text: string) => {
    if (text === saved.current) return;
    saved.current = text;
    updateDrill(p.id, { code: text });
  };
  useEffect(() => {
    const t = setTimeout(() => save(code), 400);
    return () => clearTimeout(t);
  }, [code]);
  useEffect(() => () => save(latest.current), []);

  const run = async () => {
    if (running) return;
    setRunning(true);
    save(code);
    const result = await runInWorker(code, p.fn, p.tests);
    setRunning(false);
    setOutcome(result);
    const passed = result.kind === 'results' && !result.timedOut && result.results.length === p.tests.length && result.results.every((r) => r.ok);
    // Only progress fields here: the editor may hold newer code than the run used.
    updateDrill(p.id, { attempts: (progressNow().drills[p.id]?.attempts ?? 0) + 1, ...(passed ? { solved: true } : {}) });
    if (passed) addToReview(p.pattern, 1);
    requestAnimationFrame(() => resultsRef.current?.focus());
  };

  const showHint = () => {
    if (state.hints < p.hints.length) updateDrill(p.id, { hints: state.hints + 1 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreKey(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'h') {
        e.preventDefault();
        showHint();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const passedCount = outcome?.kind === 'results' ? outcome.results.filter((r) => r.ok).length : 0;
  const allPassed = outcome?.kind === 'results' && !outcome.timedOut && passedCount === p.tests.length;

  return (
    <div className="drill">
      <section className="drill-brief">
        <p className="crumb">
          <a href={href.drills}>Drills</a> <span aria-hidden="true">/</span> <a href={href.pattern(pattern.id)}>{pattern.name}</a>
        </p>
        <h1>
          {p.title} {state.solved && <span className="solved-tag">Solved</span>}
        </h1>
        {p.prompt.map((para, k) => (
          <p key={k}><Inline text={para} /></p>
        ))}
        <h2>Examples</h2>
        <ul className="examples">
          {p.tests.slice(0, 2).map((t, k) => (
            <li key={k}>
              <code>{callText(p, t.args)}</code>
              <span className="arrow" aria-label="returns"> ⟶ </span>
              <code>{show(t.expected)}</code>
            </li>
          ))}
        </ul>

        <h2>Hints</h2>
        {state.hints > 0 && (
          <ol className="hints">
            {p.hints.slice(0, state.hints).map((h, k) => <li key={k}>{h}</li>)}
          </ol>
        )}
        {state.hints < p.hints.length ? (
          <button type="button" className="btn" onClick={showHint}>
            {state.hints === 0 ? 'Show a hint' : 'Show the next hint'} <kbd>H</kbd>
          </button>
        ) : (
          <p className="muted">That was the last hint.</p>
        )}

        <h2>Reference solution</h2>
        {state.revealed ? (
          <>
            <pre className="code-block" tabIndex={0}><code>{p.solution}</code></pre>
            <p><strong>Complexity.</strong> {p.complexity}</p>
          </>
        ) : confirmReveal ? (
          <p className="reveal-confirm">
            Reading it before you try teaches less. Still show it?{' '}
            <button type="button" className="btn small" onClick={() => updateDrill(p.id, { revealed: true })}>Show solution</button>{' '}
            <button type="button" className="btn small ghost" onClick={() => setConfirmReveal(false)}>Keep trying</button>
          </p>
        ) : (
          <button type="button" className="btn" onClick={() => (state.solved ? updateDrill(p.id, { revealed: true }) : setConfirmReveal(true))}>
            Show solution
          </button>
        )}
      </section>

      <section className="drill-work" aria-label="Your solution">
        <div className="work-bar">
          <h2>Your code</h2>
          <div className="work-actions">
            <button type="button" className="btn ghost small" onClick={() => (code === starterCode(p) || confirm('Replace your code with the empty starter?')) && setCode(starterCode(p))}>Reset code</button>
            <button type="button" className="btn primary" onClick={run} disabled={running}>
              {running ? 'Running…' : 'Run tests'} <kbd>⌘/Ctrl ↵</kbd>
            </button>
          </div>
        </div>
        <CodeEditor value={code} onChange={setCode} onRun={run} label={`Code for ${p.title}`} />
        <p id="editor-help" className="muted small-print">
          Tab indents. Press Esc, then Tab, to leave the editor. Tests run in a worker and stop after {TIME_LIMIT_MS / 1000} s.
        </p>

        <div className="results" ref={resultsRef} tabIndex={-1} aria-live="polite">
          {outcome?.kind === 'compile-error' && (
            <p className="result-summary bad">Could not run your code. {outcome.message}</p>
          )}
          {outcome?.kind === 'results' && (
            <>
              <p className={`result-summary ${allPassed ? 'good' : 'bad'}`}>
                {allPassed
                  ? `All ${p.tests.length} tests pass. ${pattern.name} is in your review deck.`
                  : outcome.timedOut
                    ? `Stopped after ${TIME_LIMIT_MS / 1000} s: ${outcome.results.length} of ${p.tests.length} tests finished. Look for a loop that never ends.`
                    : `${passedCount} of ${p.tests.length} tests pass.`}
              </p>
              <ol className="cases">
                {p.tests.map((t, k) => {
                  const r = outcome.results.find((x) => x.index === k);
                  const status = !r ? 'timeout' : r.ok ? 'pass' : 'fail';
                  return (
                    <li key={k} className={`case case-${status}`}>
                      <span className="case-status">{status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'Not run'}</span>
                      <code className="case-call">{callText(p, t.args)}</code>
                      {r && !r.ok && (
                        <dl className="case-detail">
                          <dt>Expected</dt>
                          <dd><code>{show(t.expected)}</code></dd>
                          {r.error ? (
                            <>
                              <dt>Threw</dt>
                              <dd><code>{r.error}</code></dd>
                            </>
                          ) : (
                            <>
                              <dt>Got</dt>
                              <dd><code>{r.got}</code></dd>
                            </>
                          )}
                        </dl>
                      )}
                      {r && r.logs.length > 0 && (
                        <>
                          <p className="logs-h">console.log</p>
                          <pre className="logs">{r.logs.join('\n')}</pre>
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
              {allPassed && next && (
                <p><a className="btn" href={href.drill(next.id)}>Next drill: {next.title}</a></p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
