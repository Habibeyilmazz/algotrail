# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
- Add a drill: append to one of `src/drills/problems-*.ts`. `drills.test.ts` runs the reference solution against its tests automatically.
- Screenshots in `docs/screenshots/` were taken from the real app with Playwright; `scripts/shots.mjs <dir> [baseUrl]` captures the main screens.
