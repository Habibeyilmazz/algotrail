import { useEffect, useRef, useState } from 'react';
import { ALGOS, algoById } from './algos';
import { patternById } from './drills/patterns';
import { problemById } from './drills/problems';
import { href, useRoute, type Route } from './lib/router';
import { isDue } from './lib/srs';
import { backupFileName, backupText, getProgress, saveFailed, KEY, MAX_BACKUP_CHARS, mergeProgress, parseBackup, type Progress, reloadFromStorage, resetProgress, summarize, update, useProgress } from './lib/store';
import { DrillPage, DrillsPage, PatternPage } from './ui/Drills';
import { HomePage } from './ui/Home';
import { ignoreKey } from './ui/keys';
import { ReviewPage, useNow } from './ui/Review';
import { VisualizerPage } from './ui/Visualizer';

const THEMES = ['system', 'light', 'dark'] as const;

// A one-time message that survives the reload after an import.
const FLASH = 'algotrail:flash';
const flash = (msg: string) => {
  try {
    sessionStorage.setItem(FLASH, msg);
  } catch {}
};
const takeFlash = () => {
  try {
    const msg = sessionStorage.getItem(FLASH) ?? '';
    sessionStorage.removeItem(FLASH);
    return msg;
  } catch {
    return '';
  }
};

function page(route: Route) {
  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'viz':
      return <VisualizerPage id={route.id} query={route.query} />;
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

// Each view gets its own tab title, so tabs, history and the screen reader's page announcement say where you are.
// Same as <title> in index.html, which crawlers and link previews read before the app runs.
const HOME_TITLE = 'algotrail · watch algorithms run, then practise them';

export function pageTitle(route: Route) {
  const name = (() => {
    switch (route.page) {
      case 'home':
        return '';
      case 'viz':
        return route.id ? algoById(route.id)?.title ?? 'No such visualizer' : ALGOS[0].title;
      case 'drills':
        return 'Drills';
      case 'drill':
        return problemById(route.id)?.title ?? 'No such drill';
      case 'pattern':
        return patternById(route.id)?.name ?? 'No such pattern';
      case 'review':
        return 'Review';
    }
  })();
  return name ? `${name} · algotrail` : HOME_TITLE;
}

// Keys are space-separated; the words "or" and "then" are shown as plain text between them.
const SHORTCUTS: [string, string][] = [
  ['V D R', 'Go to Visualize, Drills, Review'],
  ['T', 'Switch theme'],
  ['?', 'Show this list'],
  ['Space or K', 'Play or pause'],
  ['← → or J L', 'Step back or forward'],
  ['Home End', 'First or last step'],
  ['− +', 'Slower or faster'],
  ['H', 'Next hint (drill page)'],
  ['⌘/Ctrl Enter', 'Run tests, or apply visualizer input'],
  ['Space then 1-4', 'Reveal a review card, then grade it'],
];

const keyCaps = (keys: string) =>
  keys.split(' ').map((k, n) => (k === 'or' || k === 'then' ? <span key={n} className="muted"> {k} </span> : <kbd key={n}>{k}</kbd>));

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

  useEffect(() => {
    document.title = pageTitle(route);
  });

  // Move focus to the new page so screen readers and keyboards start at the top.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollTo(0, 0);
    main.current?.focus({ preventScroll: true });
  }, [route.page, 'id' in route ? route.id : '']);

  const fileInput = useRef<HTMLInputElement>(null);
  const [dataMsg, setDataMsg] = useState(takeFlash);
  const importDlg = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);
  useEffect(() => {
    if (pending) importDlg.current?.showModal();
  }, [pending]);

  const exportBackup = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([backupText(getProgress())], { type: 'application/json' }));
    a.download = backupFileName(new Date());
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    setDataMsg(`Exported ${summarize(getProgress())}.`);
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again fires change
    if (!file) return;
    let backup: ReturnType<typeof parseBackup>;
    try {
      // size is in bytes and the cap in characters; a UTF-8 character takes up to 4 bytes.
      if (file.size > 4 * MAX_BACKUP_CHARS) throw new Error('This file is too large to be an algotrail backup.');
      backup = parseBackup(await file.text());
    } catch (err) {
      setDataMsg(`Nothing imported. ${(err as Error).message}`);
      return;
    }
    setPending(backup);
  };

  // The import dialog's buttons close it with "merge" or "replace"; Esc or Cancel leave an empty returnValue.
  const finishImport = () => {
    const choice = importDlg.current!.returnValue;
    importDlg.current!.returnValue = '';
    const backup = pending!;
    setPending(null);
    if (choice !== 'merge' && choice !== 'replace') {
      setDataMsg('Import cancelled. Nothing changed.');
      return;
    }
    const next: Progress = choice === 'merge' ? mergeProgress(getProgress(), backup.progress) : backup.progress;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      setDataMsg('Nothing imported. This browser would not save it (storage is full or blocked).');
      return;
    }
    flash(choice === 'merge' ? `Merged the backup. This browser now has ${summarize(next)}.` : `Imported ${summarize(next)}.`);
    // Reload (store.ts loads the saved key) rather than updating in place, for the same reason as erasing:
    // a pending draft save must not overwrite the imported code.
    reloadFromStorage();
  };

  const cycleTheme = () => update((s) => ({ ...s, theme: THEMES[(THEMES.indexOf(s.theme) + 1) % THEMES.length] }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ignoreKey(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const go: Record<string, () => void> = {
        v: () => (location.hash = route.page === 'viz' ? href.viz(route.id || ALGOS[0].id, route.query) : href.viz(ALGOS[0].id)),
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
        {saveFailed && (
          <p role="alert" className="input-error">
            This browser is not saving your progress (storage is full or blocked). It lasts until you close this tab; export a backup to keep it.
          </p>
        )}
        <p>
          Progress is saved in this browser only.{' '}
          <span className="footer-actions">
            <button type="button" className="link-btn" onClick={exportBackup}>Export a backup</button>
            <button type="button" className="link-btn" onClick={() => fileInput.current?.click()}>Import a backup</button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                if (!confirm('Erase solved drills, saved code and review schedule from this browser?')) return;
                resetProgress();
                // Reload so a pending draft autosave or a test run still in flight cannot write old progress back.
                reloadFromStorage();
              }}
            >
              Erase my progress
            </button>
          </span>
        </p>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Backup file to import" onChange={importBackup} />
        <p role="status" className="footer-status">{dataMsg}</p>
      </footer>
      <dialog ref={importDlg} className="help" aria-labelledby="import-h" onClose={finishImport}>
        {pending && (
          <form method="dialog">
            <h2 id="import-h">Import this backup?</h2>
            <dl className="import-summary">
              <dt>Backup{pending.exportedAt && ` from ${new Date(pending.exportedAt).toLocaleString()}`}</dt>
              <dd>{summarize(pending.progress)}</dd>
              <dt>This browser now</dt>
              <dd>{summarize(getProgress())}</dd>
            </dl>
            <p>
              <strong>Merge</strong> keeps both: solved drills from either, the larger hint and attempt counts, this browser's saved code and settings, and for a pattern in both review decks the date that comes sooner.
              {' '}<strong>Replace</strong> makes this browser match the backup exactly.
            </p>
            <p className="dialog-actions">
              <button className="btn primary" value="merge" autoFocus>Merge</button>
              <button className="btn" value="replace">Replace</button>
              <button className="btn" value="">Cancel</button>
            </p>
          </form>
        )}
      </dialog>
      <dialog ref={help} className="help" aria-labelledby="help-h" onClick={(e) => e.target === help.current && help.current.close()}>
        <h2 id="help-h">Keyboard shortcuts</h2>
        <table>
          <tbody>
            {SHORTCUTS.map(([k, what]) => (
              <tr key={k}>
                <th scope="row">{keyCaps(k)}</th>
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
