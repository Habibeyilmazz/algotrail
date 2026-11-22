# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
- **Known limits:** the meta CSP cannot set `frame-ancestors` (static hosts cannot send headers), so the page could be framed; it holds no account or secrets, so clickjacking has little to target. Google Fonts are loaded from Google's servers, which see the visitor's IP address.

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
- Still not built (checked in round 4): syntax highlighting in the editor, a layered layout for directed graphs, merging a backup into existing progress, FSRS, visualizer input in the URL. GitHub Pages is not enabled; the workflow is manual only.
