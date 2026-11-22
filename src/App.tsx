import { useEffect, useRef } from 'react';
import { ALGOS } from './algos';
import { href, useRoute, type Route } from './lib/router';
import { isDue } from './lib/srs';
import { resetProgress, update, useProgress } from './lib/store';
import { DrillPage, DrillsPage, PatternPage } from './ui/Drills';
import { HomePage } from './ui/Home';
import { ignoreKey } from './ui/keys';
import { ReviewPage, useNow } from './ui/Review';
import { VisualizerPage } from './ui/Visualizer';

const THEMES = ['system', 'light', 'dark'] as const;

function page(route: Route) {
  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'viz':
      return <VisualizerPage id={route.id} />;
    case 'drills':
      return <DrillsPage />;
    case 'drill':
      return <DrillPage id={route.id} />;
    case 'pattern':
      return <PatternPage id={route.id} />;
    case 'review':
      return <ReviewPage />;
  }
}

const SHORTCUTS: [string, string][] = [
  ['V  D  R', 'Go to Visualize, Drills, Review'],
  ['T', 'Switch theme'],
  ['?', 'Show this list'],
  ['Space or K', 'Play or pause'],
  ['← → or J L', 'Step back or forward'],
  ['Home  End', 'First or last step'],
  ['−  +', 'Slower or faster'],
  ['H', 'Next hint (drill page)'],
  ['⌘/Ctrl Enter', 'Run tests, or apply visualizer input'],
  ['Space, then 1-4', 'Reveal a review card, then grade it'],
];

export function App() {
  const route = useRoute();
  const { theme, cards } = useProgress();
  const now = useNow();
  const due = Object.values(cards).filter((c) => isDue(c, now)).length;
  const help = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Move focus to the new page so screen readers and keyboards start at the top.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [route.page, 'id' in route ? route.id : '']);

  const cycleTheme = () => update((s) => ({ ...s, theme: THEMES[(THEMES.indexOf(s.theme) + 1) % THEMES.length] }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreKey(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const go: Record<string, () => void> = {
        v: () => (location.hash = href.viz(route.page === 'viz' ? route.id || ALGOS[0].id : ALGOS[0].id)),
        d: () => (location.hash = href.drills),
        r: () => (location.hash = href.review),
        t: cycleTheme,
        '?': () => help.current?.showModal(),
      };
      if (go[e.key]) {
        e.preventDefault();
        go[e.key]();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const section = route.page === 'viz' ? 'viz' : route.page === 'review' ? 'review' : route.page === 'home' ? 'home' : 'drills';

  return (
    <>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); main.current?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <a className="brand" href={href.home} aria-label="algotrail home">
          <svg viewBox="0 0 32 32" aria-hidden="true" className="brand-mark">
            <rect x="9" y="4" width="10" height="16" rx="1.5" transform="rotate(-8 14 12)" className="blaze" />
            <path d="M4 28c6-2 9-5 12-5s5 3 12 1" className="trail" />
          </svg>
          <span>algotrail</span>
        </a>
        <nav aria-label="Main">
          <a href={href.viz(ALGOS[0].id)} aria-current={section === 'viz' ? 'page' : undefined}>Visualize</a>
          <a href={href.drills} aria-current={section === 'drills' ? 'page' : undefined}>Drills</a>
          <a href={href.review} aria-current={section === 'review' ? 'page' : undefined}>
            Review{due > 0 && <span className="badge" aria-label={`${due} due`}>{due}</span>}
          </a>
        </nav>
        <div className="top-actions">
          <button type="button" className="icon-btn" onClick={cycleTheme} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme} (T)`}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 12.5A6.5 6.5 0 0 1 7.5 5a6.5 6.5 0 1 0 7.5 7.5z" /></svg>
            ) : theme === 'light' ? (
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 3a7 7 0 0 1 0 14z" className="fill" /></svg>
            )}
          </button>
          <button type="button" className="icon-btn" onClick={() => help.current?.showModal()} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <span aria-hidden="true">?</span>
          </button>
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {page(route)}
      </main>
      <footer className="footer">
        <p>
          Progress is saved in this browser only.{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              if (!confirm('Erase solved drills, saved code and review schedule from this browser?')) return;
              resetProgress();
              // Reload so a pending draft autosave or a test run still in flight cannot write old progress back.
              location.reload();
            }}
          >
            Erase my progress
          </button>
        </p>
      </footer>
      <dialog ref={help} className="help" aria-labelledby="help-h" onClick={(e) => e.target === help.current && help.current.close()}>
        <h2 id="help-h">Keyboard shortcuts</h2>
        <table>
          <tbody>
            {SHORTCUTS.map(([k, what]) => (
              <tr key={k}>
                <th scope="row"><kbd>{k}</kbd></th>
                <td>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form method="dialog">
          <button className="btn" autoFocus>Close</button>
        </form>
      </dialog>
    </>
  );
}
