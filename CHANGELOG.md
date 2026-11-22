# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Performance and accessibility pass (round 8)

Measured first, against the production build served by `vite preview`: Lighthouse 12.8 (mobile and desktop presets, simulated and real DevTools throttling), axe-core 4.14 (WCAG 2.2 AA plus best practice) on 11 routes in both themes at 1280 and 390 px, a 320 px reflow check on all 23 routes, startup and step timing with Playwright, and a bundle breakdown from source maps.

Baseline: JS 435.99 kB (144.70 kB gzip), CSS 6.03 kB gzip, plus a render-blocking Google Fonts stylesheet. Lighthouse mobile (simulated) Performance 98, FCP 2.0 s; desktop 100, FCP 0.5 s; Accessibility 100; Best practices 100; SEO 91. axe: no violations on any of the 44 page checks; no horizontal scroll at 320 px. Visualizer runs are cheap: the biggest one (8-Queens, 1,088 frames) is built in 5 ms and a step renders in about 1 ms, so nothing there needed work.

- **Changed: fonts are self-hosted** (`@fontsource/atkinson-hyperlegible`, `@fontsource-variable/bricolage-grotesque`, `@fontsource/jetbrains-mono`, imported in `src/main.tsx`). The Google Fonts stylesheet blocked first paint, so a slow or filtered font host held the whole page blank: with that host stalled for 8 s, first paint went from 8.06 s to 0.06 s. Unthrottled, the app is ready about 150 ms sooner (time to first rendered player, median of 5 cold loads: 212 → 57 ms). Visitors' IP addresses no longer go to Google (an open item in the security pass). The CSP drops Google and allows `font-src 'self'`. Vite's asset inlining is off (`assetsInlineLimit: 0`), otherwise the small font files were base64-inlined into the render-blocking CSS (6 → 20.5 kB gzip).
- **Changed: GSAP loads after the first render** (`src/ui/panels.tsx`), and not at all when the visitor prefers reduced motion. Startup JS drops from 144.70 to 117.24 kB gzip; GSAP is a separate 27.44 kB gzip chunk. The first frame of a run never animates, and a step taken before GSAP arrives snaps into place.
- **Fixed: every page was titled "algotrail"** (WCAG 2.4.2 Page Titled), so tabs, history and the screen reader's page announcement could not tell a drill from the review page. Each route now sets `document.title`, for example "Toll grid · algotrail" or "No such visualizer · algotrail" (`pageTitle` in `src/App.tsx`), and the home title describes the app.
- **Simplified:** CI built the app twice (`npm run build`, then `npm run e2e`, which builds first); the separate build step is gone. The review page's "Next up" line sorted the deck twice to find the same card; it sorts once. An audit for dead code found nothing else to delete: every dependency, CSS class (some are built from tone and status names) and export is used.
- After (same conditions): Lighthouse with real DevTools throttling (mobile), FCP 2.13 → 1.97 s, CLS 0.006 → 0.011 (font swap; well under 0.1). Desktop Performance stays 100, Accessibility 100, Best practices 100. axe still reports nothing on 44 page checks.
- **Known trade-off:** Lighthouse's *simulated* mobile score drops from 98 to 90 (FCP 2.0 → 2.8 s). Its model counts the 156 kB of self-hosted fonts as competing with the main script for bandwidth before first paint; with real throttling first paint did not get slower (2.1 s with the font change alone, 1.97 s once GSAP was deferred too), so the change was kept. Making the display font smaller (its weight-only variable file is 41 kB instead of 77 kB, but loses the optical-size axis the headings use) would win most of it back.
- SEO stays 91: the only failing audit is `robots.txt`, which `vite preview` answers with the app's HTML. On GitHub Pages the file would live under `/algotrail/`, where crawlers do not read it, so none was added.
- e2e: 24 steps (new: page titles, no request to another origin and all three fonts loaded under the CSP; GSAP is fetched and a swap animates, and with reduced motion GSAP is never requested and nothing moves).
- **Still open:** only Chromium is tested. FSRS and syntax highlighting are not built. GitHub Pages is not enabled. No social preview image (it needs an absolute URL, so it waits for a hosted copy).

### Share links and merging backups (round 7, feature)

Chosen by using the app: a visualizer run on your own input could not be shown to anyone else (a study partner, an issue report) without describing the input by hand, and importing a backup from a second device wiped this one's progress. Both were listed as not built.

- **Added: share links for visualizers.** Applying input writes it into the address as `#/visualize/<id>?<field>=<value>` (only fields that differ from the example), so the address bar is always a link to what is on screen, and Back returns to the previous input. *Copy link* copies it with the current step (`&step=6`); whoever opens it lands on that step. If the clipboard is blocked, the link is shown in a field to copy by hand. Pressing `V` on a visualizer keeps its input.
- Link input is untrusted: `inputFromQuery` (`src/algos/index.ts`) reads only the algorithm's own field names, clips each to 2,000 characters, and the result goes through the same parsers as typed input, so a bad link shows the usual input error. `step` must be a positive integer, else the link opens at step 1.
- Applying input uses `navigate` (`src/lib/router.ts`: `pushState` plus a synchronous `hashchange`), so a key pressed right after Ctrl+Enter acts on the new run; with a plain `location.hash` write the route updated one task later.
- **Added: Merge when importing a backup.** The import confirm prompt is now a dialog with *Merge* (the default), *Replace* and *Cancel* (Esc also cancels). `mergeProgress` in `src/lib/store.ts`: solved and revealed from either side, the larger hint and attempt counts, this browser's saved code (the backup's when this browser has none) and settings, and the sooner-due card when both decks hold a pattern. Merging is idempotent.
- Tests: share-link round trip, every algorithm's example fits in a link, hostile queries, step parsing, parseHash with queries, merge semantics (unit); e2e copies a link at step 3, opens it in a fresh browser profile, opens a link with bad input, goes Back, and imports with Cancel, Esc, Replace and Merge. The e2e suite has 22 steps.
- Codex was asked for a second-opinion review but its usage limit was reached, so this round was reviewed by hand only.
- **Still open:** only Chromium is tested. FSRS and syntax highlighting are not built. GitHub Pages is not enabled, so share links point at whatever host serves the app (for now, `localhost`). No social preview image.

### Launch pass (round 6)

Made the repo ready for visitors, and fixed the real bugs found on the way (each reproduced with a failing e2e step first). The e2e suite now has 21 steps.

- **Fixed: closing the tab within 0.4 s of typing lost those keystrokes** (a gap reported last round). The drill draft is also saved on `pagehide` and when the tab is hidden (`visibilitychange`). e2e closes a tab mid-autosave and reads the draft from a second tab.
- **Fixed: a key typed right after Enter or Tab in the drill editor could land in the wrong place** (`return` became `eturn` with the `r` at the end). The editor reset the caret one frame after auto-indenting, moving it under any key typed within that frame. Found while recording the demo GIF.
- **Fixed: Ctrl/⌘+Enter did nothing in one-line visualizer fields** (numbers, target), although the shortcut list says it applies the input. It worked only in multi-line fields; the handler now sits on the form.
- **Fixed: saved progress for drills that no longer exist was kept**, so an imported backup could be counted as having more solved drills than the app has. `sanitize` drops unknown drill ids, as it already did for review cards.
- **Fixed before release (Codex review):** the new tab-close save could write a pending draft, or the tab's old progress, back over freshly erased or imported progress during the reload. Saving stops once Erase or Import starts its reload (`reloadFromStorage` in `src/lib/store.ts`).
- **Added: `docs/demo.gif`** at the top of the README, recorded from the built app by `scripts/readme-demo.mjs` (Playwright video plus ffmpeg): quick sort on typed input, then a drill typed in and passing.
- **Added: CONTRIBUTING.md** (setup, how drills and visualizers are built and tested, write drills from scratch), **SECURITY.md** (scope; private vulnerability reporting is not enabled, so it asks for a contact request issue without details), and issue forms for bugs and drill or visualizer ideas.
- **README:** a one-line pitch, the demo, a shorter quickstart, a comparison table with VisuAlgo, the USFCA visualizations, Algorithm Visualizer, LeetCode/NeetCode and Anki saying when to use each instead, a status section (Chromium-only testing, no hosted copy) and a contributing section. Repo description and topics were already set and still match.
- **Still open:** importing replaces rather than merges. Only Chromium was tested. FSRS, syntax highlighting and visualizer input in the URL are not built. GitHub Pages is not enabled, so there is no live demo link. No social preview image was made (GitHub only accepts one through the web settings); the logo from an earlier round is unchanged.

### Reliability pass (round 5, tests)

Tried to break the built app with Playwright (odd, empty, huge and non-ASCII input, malformed and BOM-prefixed backup files, offline runs, blocked storage, odd return values from drill code) and checked the time-zone and boundary logic with unit tests. Each bug below was reproduced, got a failing test first, then the fix. Visualizer inputs held up: every probe gave frames or a clear input error. Codex reviewed the diff and found nothing.

- **Fixed: Export could miss the last 0.4 s of typing** (a gap reported last round). The drill draft is now also saved when the editor loses focus, which clicking Export (or anything else) does first. e2e: type, click Export at once, check the file.
- **Fixed: one huge paste stopped all saving.** A 6M-character draft overflowed `localStorage`, so every later save in that tab (hints, solved drills, review grades) failed silently and was gone after a reload. Drafts of 50,000 characters or more (`MAX_CODE`, the cap `load()` already applied) are no longer stored; the last draft that fits is kept and the drill page says the long one is not saved. e2e covers it.
- **Fixed: a failed save was silent.** When the browser refuses to store progress (quota, blocked storage), the footer now says progress lasts only until the tab closes and suggests exporting a backup. e2e stubs `setItem` to throw.
- **Fixed: offline, a test run blamed the code.** If the worker script cannot load, the drill page said "Could not run your code. The code could not be run." It now says the test runner did not load and to reconnect. e2e runs a drill with the browser offline.
- **Fixed: declining an import left an older, unrelated message** (for example "This file is not valid JSON") in the footer. It now says "Import cancelled. Nothing changed."
- **Fixed: backup file names used the UTC date**, so a backup made at 01:00 in UTC+3 was named after the day before. `backupFileName` uses the local date; tested in UTC+14 and UTC-11.
- **Fixed: review times said "in 60 min" and "in 24 h"** just under the hour and day boundaries; they now round up to "in 1 h" and "in 1 day".
- **Fixed: drill results showed a BigInt `2n` as `2`**, identical to the expected number, and an `async` solution's Promise as `{}`. They now read `2n` and "Promise (return the value itself, not a Promise)".
- **Fixed: trie input lowercased before checking**, so `İz` was reported as `"i̇z"` and the Kelvin sign `K` was accepted as `k`. Words are checked as typed, then lowercased.
- The e2e suite now has 18 steps (about 10 s including the build) and prints the console errors it finds.
- **Checked, no change needed:** a UTF-8 BOM in a backup is accepted; empty, binary, UTF-16 and `progress: null` files are refused with a message; far-future `exportedAt` dates display; drill code that throws `null`, returns a symbol, a cyclic object, a 1M-element array or logs 100,000 lines is reported without breaking the page.
- **Still open:** importing replaces rather than merges (a design choice, shown in the confirm dialog). Only Chromium was tested; Safari and Firefox were not (no browsers for them on this machine). A backup can list solved drills whose ids no longer exist, and the import prompt counts them. Typing and closing the tab within 0.4 s can still lose those keystrokes. FSRS, syntax highlighting and visualizer input in the URL are not built. GitHub Pages is not enabled.

### Progress backups (round 4, feature)

Chosen after using the app as a newcomer: everything (solved drills, saved code, the review schedule) lived in one browser's `localStorage` with no way out, so a new laptop, a phone, or clearing site data lost weeks of spaced review. The footer only offered "Erase my progress".

- **Added: Export a backup / Import a backup** in the footer. Export downloads `algotrail-backup-YYYY-MM-DD.json`. Import asks for a file, shows "Backup: N solved drills and M patterns in review" next to what this browser has now, and on confirm replaces this browser's progress, then reloads (like Erase, so a pending draft save cannot overwrite the imported code) and says what was imported. A wrong file, bad JSON, another version or an oversized file gets a message and changes nothing; so does a browser that refuses to store it.
- The file format is `{ app: "algotrail", version: 1, exportedAt, progress }`. `parseBackup` in `src/lib/store.ts` checks the tag, version and size (5M characters) and passes `progress` through the existing `sanitize`, so an edited or hostile file is cleaned the same way as stored data.
- Tests: `progress backups` in `src/lib/lib.test.ts` (round trip, refusals, cleaning, summary text) and an e2e step that exports, erases, imports a wrong file, declines once, then imports and compares stored progress with the original under the production CSP.
- Fixed before release (Codex review): the file size check compared bytes against the character cap, so a backup with non-ASCII code could be refused although it was valid.
- **Known limits:** importing replaces, it does not merge two devices' progress. Export reads saved progress, so code typed in the last 0.4 s before clicking Export (before the draft autosave) is not in the file. Saved code of 50,000 characters or more was already dropped on load and is dropped on import too.

### Security pass (round 3)

Reviewed by hand plus a Codex second opinion (the security-review skill could not run in this session). Problems were reproduced with Playwright against the built app before fixing.

- **Fixed: drill code could blank the page, fake a pass, or hang the tab.** User code shares the worker with the reporting code, so it could post its own messages. `self.postMessage({ type: "case", result: null })` crashed React (white page); posting `ok: true` cases and `done` marked the drill solved and added the pattern to review; returning or logging a 30M-character string put 180 MB of text in the DOM. Now the worker gets only the arguments and posts back raw return values. The page (`judge` in `src/drills/runner.ts`) rebuilds each message field by field, ignores bad or duplicate indexes, decides pass or fail against expected answers the worker never sees, and clips text to 2,000 characters. A return value that cannot be cloned (a function) counts as a wrong answer instead of breaking the run. Regression tests: `judge` unit tests in `drills.test.ts` (including arrays whose own `slice` is shadowed, found by Codex) and an e2e step that tries all three attacks.
- **Added: a Content-Security-Policy meta tag in the build** (`vite.config.ts`, build only because the dev server needs inline scripts). It blocks inline and third-party scripts, plugins and `<base>` hijacking. `'unsafe-eval'` stays because some browsers apply the page policy to the drill worker. An e2e step checks that an injected inline script is blocked. This is defense in depth: no HTML-injection sink was found (React escapes all text, no `innerHTML`).
- **Checked, no change needed:** visualizer input is validated with size caps in `src/algos/parse.ts` and never read from the URL; hash routes are shown only as escaped text; stored progress is rebuilt field by field on load (including progress from other tabs); `npm audit` reports 0 vulnerabilities; every lockfile entry resolves from registry.npmjs.org; git history has no secrets and one noreply author; both workflows have read-only default permissions, `persist-credentials: false`, and actions pinned to commit SHAs that match their tags (checked with `git ls-remote`). Only the manual Pages job gets `pages: write` and `id-token: write`.
- **Known limits:** the meta CSP cannot set `frame-ancestors` (static hosts cannot send headers), so the page could be framed; it holds no account or secrets, so clickjacking has little to target. Google Fonts are loaded from Google's servers, which see the visitor's IP address (fixed in round 8: fonts are self-hosted).

### Design and accessibility pass (round 2)

Checked with real screenshots at 1440, 1280, 1024, 800 and 390 px in both themes, and with axe-core (WCAG 2.2 AA plus best practice) on every page at desktop and phone width. axe now reports nothing on the pages checked.

- Ruled-out cells (outside the binary-search range, discarded merge halves) were faded to 2:1 contrast. They now have a dashed outline and muted text at 4.5:1 or better.
- A single small panel (one array) sits in the middle of the stage instead of leaving an empty band above the note.
- Home: the demo array stays on one row beside the hero copy (it wrapped from 961 to 1099 px); its step counter stays on the transport row on phones; the patterns table no longer wraps "not started" or the solved count.
- Keyboard focus no longer lands under the sticky top bar (`scroll-padding-top`). On phones the two-row top bar scrolls away instead of covering an eighth of the screen.
- Template code blocks and wide DP tables can be focused and scrolled with the keyboard. While a DP table has focus the arrow keys scroll it rather than step the player.
- Maze walls and queens are `role="img"` so their labels are read; the scrubber announces "Step N of M"; the pseudocode panel is no longer a nested `aside` landmark.
- A wrong visualizer link keeps the algorithm list beside the message; wrong drill and pattern links point to the drill list.
- The shortcut dialog shows one keycap per key; `console.log` output in test results is labelled; speed controls sit at the right edge when the transport wraps; "Add it now" on a pattern page has its own line.
- `scripts/readme-shots.mjs` retakes the four README screenshots from a running preview, and they were retaken.

### Changed

- 44 drill test cases in 27 drills (often the two shown as examples) reused the exact inputs of well-known LeetCode and textbook examples. They now use new inputs, worked out by hand and confirmed by the reference solutions. The drill screenshot was retaken.
- `npm run e2e` now builds first, so a fresh clone no longer fails with "preview server did not start" and a stale `dist/` is never tested.
- A mistyped visualizer link (`#/visualize/<unknown>`) shows "No such visualizer" instead of silently opening binary search.
- "Reset code" asks before replacing code that differs from the starter.

### Added

- `src/algos/fuzz.test.ts`: 400 random edits of each visualizer's example input must give frames or a readable input error, never a crash.

### Fixed

- A malformed link such as `#/drills/%` no longer leaves a blank page.
- "Erase my progress" reloads the page, so a draft autosave or test run still in flight cannot write the erased progress back.
- Graph inputs reject the same edge listed twice (it drew two overlapping edges that both lit up as the shortest-path tree). Opposite directions stay allowed in topological sort.
- Topological sort no longer says every unplaced node is on a cycle; some only wait on one.
- Trie note says "1 word starts with", not "1 word start with".
- Removed unused `orderedPatterns`, `setPlaying` and an unused editor ref.
- A test run no longer overwrites code typed while the tests were running, and a draft typed just before leaving a drill is saved.
- Blocked `localStorage` no longer stops the app from starting.
- Review ignores stored cards for unknown patterns or with fractional counters; SM-2 intervals round up as the algorithm specifies.
- The test runner no longer treats arrays of different lengths with holes as equal.
- Page shortcuts are off while the shortcut dialog is open.
- The "Trail days" reference solution handled sums above 2^31 wrongly; a test now covers it.
- Graphs and trees have text alternatives listing their nodes and links.
- Light-theme green darkened to meet 4.5:1 text contrast.

## [0.1.0] - 2026-11-22

### Added

- Frame-based visualizer engine (`src/algos/`) with 18 algorithms: binary search, two pointers, sliding window, quick sort, merge sort, grid BFS and DFS, graph BFS and DFS, Dijkstra, topological sort, union-find, binary heap, trie, N-Queens, LCS, 0/1 knapsack, coin change. All accept user-edited input with validation and a 1,500-frame cap.
- Player with play, pause, step, scrub, speed, highlighted pseudocode, variables and per-step notes; GSAP FLIP motion that is skipped under reduced motion.
- 43 original drills in 12 patterns with hint ladders, tests, reference solutions and complexity notes; tests run in a Web Worker with a 3 s timeout.
- SM-2 review of patterns; progress, drafts and settings in one sanitized `localStorage` key.
- Home, drills, pattern, drill and review pages; light and dark themes; keyboard shortcuts; phone layout.
- Vitest unit tests, a Playwright smoke test (`npm run e2e`), CI, and a manual-only GitHub Pages workflow.

### Notes for the next contributor

- Add a visualizer: write an `Algo` in `src/algos/`, register it in `src/algos/index.ts`, add result tests in `algos.test.ts`. The e2e test expects 18 links in the sidebar; update the count.
- Add a drill: append to one of `src/drills/problems-*.ts`. `drills.test.ts` runs the reference solution against its tests automatically. Make up new test inputs; do not reuse examples from judge sites. The first two tests are shown as examples on the drill page.
- Screenshots in `docs/screenshots/` were taken from the real app with Playwright; `scripts/shots.mjs <dir> [baseUrl]` captures the main screens. To refresh the README images: `npm run build && npm run preview`, then `node scripts/readme-shots.mjs`.
- Still not built (checked in round 7): syntax highlighting in the editor, a layered layout for directed graphs, FSRS. GitHub Pages is not enabled; the workflow is manual only.
