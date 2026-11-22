# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Launch pass (round 14)

Checked the repo as a first-time visitor would: README claims against the code (18 visualizers, 43 drills, 12 patterns, 27 e2e steps all match), the demo GIF and screenshots against the current build (they match; the GIF predates *Try your own input*, which the README describes in text), repo description and topics (still accurate), CONTRIBUTING, SECURITY and the issue forms. Little needed changing there, so most of the round went to the gaps reported last round. Codex was asked for a review and its usage limit was still reached; the security-review skill was not run (this session's working directory is not a git repository). The newest trust-boundary code (`parseArgs`, `judge`, the custom-input run) was re-read by hand: a crafted return value cannot make the page's comparison recurse past the reference answer's own depth, and typed arguments are parsed, never evaluated. No change.

- **Changed: your own input on a drill stays while the tab is open.** Leaving a drill and coming back used to reset *Try your own input* to the first example; it now keeps what you typed (a per-tab map in `src/ui/Drills.tsx`, not stored). The e2e custom-input step leaves the drill and comes back (it failed before the change). README updated.
- **Changed:** the bug report form asks for the visualizer's *Copy link* address, which carries the input and the step.
- **Investigated: Firefox loses a draft typed just before the tab closes.** The e2e step no longer skips Firefox: it runs, records every save either tab makes (from page load, through an init script), the editor text and the value React last rendered at `beforeunload`, `pagehide` and `visibilitychange`, and prints them. In Firefox it reports a loss as `# known Firefox issue` instead of failing; Chromium and WebKit still fail on a loss. Over 14 Firefox CI runs the draft was lost 7 times. In every lost run the tab closed 4 ms after typing (well before the 0.4 s autosave), all three events fired with the draft both in the editor and in React's rendered value, the test's own `localStorage` probes written from those events arrived, and **no tab made any save at all**: the app's `pagehide` save never reached `localStorage.setItem`. In kept runs the save happens in `pagehide`. So this is not a storage-sync delay between tabs; the app's flush either did not run or failed before writing. A further probe that wrapped `addEventListener` to log when listeners are added and run made the loss disappear (8 of 8 runs kept), so it was removed again; that hints at a timing race inside Firefox's page teardown rather than a logic error, but it is not proven.
- **Still open:** the Firefox tab-close loss above (next step: reproduce with a local Firefox, or try saving the draft from a listener registered at module load in `src/lib/store.ts` instead of a React effect, and compare loss rates over 10+ CI runs). A small related flaw seen while reading: `save` in `Drill` marks a draft as saved before the write, so after a failed write (storage full) the same text is not retried on the next blur. The IME fix is still checked only through Chromium's CDP. Nothing tried on a real phone. The custom input is kept per tab, not across reloads.

### Reliability pass (round 13, tests)

Tried to break the built app again: every visualizer on 216 random valid edits of its example (dev build, so React warnings count) and on inputs at each parser's size limit, at 320, 375 and 1280 px; odd routes and share links (unknown ids, `__proto__`, malformed escapes, a 1M-character query, huge and negative `step`); and the drill page with long, deep and non-ASCII input. Visualizers held up: no console error, no overflow, every run reached its last step. Each bug below was reproduced, got a failing test first, then the fix. Codex was asked for a review and its usage limit was still reached.

- **Fixed: a deeply nested custom input froze the drill's *Try your own input*.** `[[[…]]]` 4,990 levels deep fits the 10,000-character limit, but `postMessage` threw on it, the run never finished and the button stayed on "Running…" until a reload, with two workers left running. `parseArgs` now refuses arguments nested more than 100 levels deep with a message (unit test; the e2e custom-input step types the 4,990-level input).
- **Fixed: long unbroken text widened the whole page.** An input error quotes the bad token, so a share link like `?a=xxxx…` (clipped to 2,000 characters) made the error line, and the page, about 17,000 px wide; a long `console.log` line or compile error did the same on the drill page. Input errors, logs and result summaries now wrap anywhere (`src/styles.css`). The phone-width e2e step checks an input error, a long log and return value, a long thrown error and a long syntax error.
- **Fixed: confirming an input method composition in the drill editor broke the line.** Typing Japanese (or Chinese, Korean) on an indented line, the Enter that picks the conversion also ran auto-indent, adding a newline and two spaces after the text. The editor now leaves Enter and Tab alone while composing (`isComposing`, or keyCode 229 as Safari sends just after composition ends). A new e2e step drives a real composition through the Chrome DevTools Protocol, so it runs in Chromium only and logs a skip in Firefox and WebKit. The suite has 27 steps.
- **Checked, no change needed:** routes with unknown or prototype-named ids show the "No such …" pages; a malformed `%` escape in a link is shown as an input error, not a crash; `step` past the end opens the last step. Custom input with deep nesting below the limit, long strings and non-ASCII text runs normally.
- **Still open:** the Firefox tab-close draft step is still skipped and not reproduced (only Playwright's Chromium is installed on this machine). The IME fix was checked in Chromium through CDP only, not with a real input method or in Safari. The custom input is still not saved when you leave the drill (left as is: a convenience, not a data-loss bug). The security-review skill was not run. Nothing tried on a real phone.

### Try your own input (round 12, feature)

Used the app as a newcomer would: watched a few visualizers, opened drills, ran the empty starter and a wrong answer. The thing missing most was a way to run your code on an input of your own: the only cases were the drill's fixed tests, so checking an edge case you thought of, or shrinking a failing test to see what goes wrong, meant editing a test by hand inside your function.

- **Added: *Try your own input* on every drill page** (a closed `<details>` under the editor). Type the arguments as JSON values separated by commas, the way the examples are written (the box starts with the first example). Your code and the reference solution run on them in two workers under the usual 3 s limit, and the page shows both answers, whether they match, and your `console.log` output. If the reference throws or runs out of time, the page says the input is probably outside the problem's rules. The reference answer is shown without its code, so this works before you reveal the solution. A custom run is not an attempt and never marks a drill solved.
- Arguments go through `parseArgs` (`src/drills/runner.ts`): `JSON.parse` only, at most 10,000 characters, and exactly as many values as the function has parameters, with a message that names them (`Give 2 arguments (nums, k), not 1.`). `judge` now passes the returned value through to the page (data only, used for the comparison). Unit tests cover parsing, refusing non-JSON (`'single'`, `undefined`, `NaN`, trailing commas, code) and the first example of every drill reading back as its own arguments; a new e2e step (26 in all) runs a match, a malformed input and an infinite loop, and checks the run left no attempt behind. Checked by hand at 1280 px and at 390 px in the dark theme (no horizontal scroll).
- **Known limit:** the reference solutions assume valid input, so outside a problem's rules they may still return an answer (`kthLargest([5, 1, 9], 7)` returns 1) rather than throw; the help text says to keep to the rules. The custom input is not saved: it resets to the first example when you open the drill again.
- **Still open (unchanged):** the Firefox tab-close draft step is still skipped and not reproduced (no Firefox on this machine; Playwright's Chromium is the only browser installed here). The security-review skill was not run this round. Codex was asked for a review and its usage limit was still reached. Nothing tried on a real phone.

### Security pass (round 11)

Reviewed the whole repo by hand against the trust boundaries (share-link query and hash, backup import and `localStorage`, other tabs' `storage` events, the drill worker), the CSP, the workflows and the dependencies. The security-review skill could not run (it needs the session's working directory to be a git repository, and this session's was not); Codex was asked once and its usage limit was still reached.

- **Fixed: the CSP allowed inline styles** (`style-src 'self' 'unsafe-inline'`) although nothing needs them: the build links its CSS, and React and GSAP set styles through `element.style` (the CSSOM), which CSP does not restrict. An injected `<style>` would have applied. The policy is now `style-src 'self'` (`vite.config.ts`). The e2e CSP step injects a `<style>` and expects a `style-src` violation; it failed with the old policy. Chromium and Firefox log CSP violations as console errors, which fail the suite, and neither logged another one across the 25 steps; WebKit passed too (not checked whether it logs them the same way). README said styles came "from the same origin only", which is now true.
- **Checked, no change needed:** a share link with every field at its 2,000-character cap or at each parser's limit builds its frames in at most 8.4 ms (8-Queens, 1,088 frames; `MAX_FRAMES` caps every run at 1,500), so a crafted link cannot freeze a tab. `npm audit`: 0 vulnerabilities; all 101 lockfile entries resolve from registry.npmjs.org with an integrity hash. Git history: no secrets, one noreply author. All five actions are pinned to the commit SHAs their tags point to today (`git ls-remote`), checkout does not persist credentials, workflows default to `contents: read` and no `run:` step interpolates event data. No `innerHTML`, `dangerouslySetInnerHTML` or URL-built `href` in `src`; the backup and stored progress go through `sanitize`; worker messages through `judge`.
- **Known limits (unchanged):** drill code from an imported backup only runs when you press Run, and the worker has no access to stored progress; on a static host the worker script gets no CSP of its own, so that code can make network requests, as any code you paste into a console can. The meta CSP cannot set `frame-ancestors`. No Dependabot config was added (it would open pull requests unattended).
- **Still open:** the Firefox tab-close draft step is still skipped and not reproduced (no local Firefox; this round did not install one). Nothing tried on a real phone.

### Design pass (round 10)

Looked at real screenshots of the built app (Home, three visualizers, drill list, a drill with a failing run, a pattern page, Review empty and with a card, the shortcut dialog, keyboard focus, an input error) at 1440, 1280 and 390 px in light and dark. The design held up; the fixes are small and specific.

- **Fixed: wrapped pseudocode lines lost their indent.** A long line inside a loop (Dijkstra's relax step, LCS, knapsack, every line on a phone) wrapped back to the left of the code column, so the continuation looked like a new outer line. Leading spaces are now padding with a 2ch hanging indent (`Pseudocode` in `src/ui/Player.tsx`), so a continuation sits under its own line.
- **Fixed: an empty "Variables" heading.** Frames without variables (the first LCS step, for example) showed the heading over nothing; they now say "None yet at this step."
- **Changed: Review with an empty deck** is headed "Your deck is empty" instead of "Nothing due right now", and review cards no longer have extra space under their last line.
- **Changed:** short code in drill statements no longer breaks mid-expression (`r * r` / `<= n` on a phone). The longest such snippet is 24 characters; a 320 px check on all 43 drills shows no horizontal scroll. On a phone the visualizer's complexity line sits closer to its summary.
- README screenshots retaken from the built app (`scripts/readme-shots.mjs`).
- **Reviewed, left alone:** the drill editor is tall on a phone (58% of the screen) so results sit below the fold after a run; the empty-deck card keeps the green "done" stripe.
- **Still open:** the Firefox tab-close draft step is still skipped; no Firefox is installed on the machine this round ran on, so it was not reproduced. Everything else under round 9's "Still open" stands.

### First-run review (round 9)

Cloned the repo fresh into an empty folder and followed the README quickstart word for word (`npm ci`, `npm run dev`, then typecheck, unit tests, e2e): everything installed and ran, and a drill ran in the dev server. Then read the whole codebase as a reviewer (by hand, plus the code-review skill); Codex was asked again but its usage limit was still reached.

- **Fixed: a slow first load blamed correct code.** The 3 s test limit started when the worker was created, so on a slow connection a worker script that took over 3 s to download made correct code read "Stopped after 3 s ... Look for a loop that never ends." The worker now posts `ready` before running anything, and the page starts the limit then (accepted once, so user code cannot push it back). A runner that has not loaded after 20 s gets the "did not load" message. e2e delays the worker script by 3.5 s and expects a pass (it failed before the fix).
- **Fixed: README said Node.js 20.19 works.** Vitest 5 declares `^22.12`, so the README, CONTRIBUTING and a new `engines` field in `package.json` say 22.12 or newer (npm now warns on older Node).
- **Fixed: README said `dist/` "works from any folder".** Opened from disk (`file://`) it is a blank page, because browsers block module scripts there (checked in Chromium). The README says to serve it over HTTP and lists `npm run preview` (port 4201). It also said 22 e2e journeys; there are 25.
- **Fixed: a review card could be deleted on load after a long streak.** `review()` had no ceiling, but the loader drops cards with ease above 5 or an interval above 36,500 days. The schedule now stays inside those bounds (unit test: 40 "easy" grades in a row survive a reload). Reaching it took decades, so no one lost a card.
- **Fixed: the pattern page's "next review" never moved on** while the page stayed open (it read the clock once); it now refreshes every 30 s like Home and Review.
- **Simplified:** Dijkstra sorted its heap again before every pop although every push already kept it sorted. Frames are byte-identical.
- **Added: the e2e suite runs in Firefox and WebKit too** (`BROWSER=firefox|webkit npm run e2e`; CI is a three-browser matrix). No app bug was confirmed in either engine; one Firefox result is still unexplained (see Still open). The suite itself had Chromium-only assumptions, now fixed: only Chromium lets a test read the clipboard (elsewhere the step records what the page writes); Firefox serves the cached worker while offline (the offline step now blocks the worker request); Firefox and WebKit hand a `localStorage` write to other tabs, and fire `hashchange` after `goBack()`, a moment later (the steps poll for up to 2 s); WebKit's `page.goto` to another fragment just after a reload changed the URL without a `hashchange` (steps now set `location.hash` in the page), and a `load` event after Erase did not always belong to the reloaded page (steps now wait until a marker set on the old window is gone); Firefox logs the CSP violation late; and Firefox now and then ignored a file-picker click right after a dialog closed (the step clicks again once). On failure the suite prints each open page's URL and text. CI passed three times in a row with all three browsers.
- **Reviewed, left alone:** some pseudocode lines are never highlighted on the example input (a `return −1` that is not reached, loop headers folded into the step after them); knapsack shows "take" and "max" in one frame on the max line. Global key listeners re-subscribe on every render, which works.
- **Still open: a draft typed just before closing the tab is sometimes not saved in Firefox CI.** In about half of the full e2e runs the other tab never saw the draft, although `pagehide`, `visibilitychange` and `beforeunload` all fired with the text in the editor (probes written from those same events did arrive). A 30-run and a 15-run isolated loop of the same scenario lost it once in 45. As a guess at render timing, the drill page now updates its latest-draft ref in the change handler, not only during render; that did not make the step pass reliably, so the step is skipped in Firefox (it passes in Chromium and WebKit). Next step: reproduce with a local Firefox (not installed on the machine this round ran on).
- **Still open:** the Lighthouse simulated mobile score is still 90 (the font trade-off described in round 8). Nothing has been tried on a real phone or in Safari itself (WebKit on Linux is the closest). FSRS and syntax highlighting are not built. GitHub Pages is not enabled. No social preview image.

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
