# Contributing to algotrail

Thanks for looking. Bug reports, new drills and new visualizers are all welcome. Small pull requests are easier to review than big ones, so one drill or one fix per PR is ideal.

## Set up

Needs Node.js 22.12 or newer (the test runner, Vitest 5, requires it; CI uses 22).

```sh
npm ci
npm run dev          # http://localhost:4200
```

Before you open a pull request, run what CI runs:

```sh
npm run typecheck
npm test             # vitest unit tests
npm run e2e          # builds, then drives the built app in Playwright Chromium
                     # (first time only: npx playwright install chromium)
```

## Adding a drill

Drills live in `src/drills/problems-search.ts`, `problems-graphs.ts` and `problems-build.ts`, grouped by pattern (pattern ids are in `src/drills/patterns.ts`). Each drill is one `Problem` object (`src/drills/types.ts`).

- **Write it yourself.** Do not copy or paraphrase problem statements from LeetCode, HackerRank, textbooks or other sites, and do not reuse their example inputs. Give the problem its own small story and its own numbers.
- **Tests:** at least three, including edge cases (empty input, one element, duplicates, the largest allowed value). Work the expected answers out by hand; the unit tests then check that your reference solution agrees.
- **Hints:** at least three, from a gentle nudge to nearly the whole idea.
- **Reference solution and complexity:** plain JavaScript, with a short explanation of the time and space cost.

`src/drills/drills.test.ts` runs every reference solution through the same runner the page uses, and checks that the empty starter code fails, so `npm test` tells you if anything is off.

## Adding a visualizer

A visualizer is an `Algo` (`src/algos/types.ts`): input fields, pseudocode lines, and a `run` function that turns validated input into an array of frames. Each frame names the pseudocode line, a one-line note, the variables, and the panels to draw (array, grid, graph, tree or list). The player only indexes into that array, so you do not write any animation code.

1. Parse input with the helpers in `src/algos/parse.ts`. Input is untrusted: cap its size and throw an error with a message a learner can act on.
2. Write the `run` function next to similar ones (`arrays.ts`, `sorting.ts`, `graphs.ts`, `grids.ts`, `structures.ts`, `dp.ts`) and add it to `ALGOS` in `src/algos/index.ts`.
3. Add a result test to `src/algos/algos.test.ts`. The shared tests already check every visualizer's default input and fuzz it with random edits (`fuzz.test.ts`).

## Style

- No new runtime dependencies without a good reason; the app uses React and GSAP only.
- Keep it accessible: everything must work from the keyboard, and motion must respect `prefers-reduced-motion`.
- User-facing text is plain and specific: say what happened and what to do next.
- Update `CHANGELOG.md` under `[Unreleased]` with what changed for users.

## Reporting bugs

Open an issue with the steps, what you expected and what happened. For visualizer bugs, paste the input you used. For security problems, see [SECURITY.md](SECURITY.md) instead.

By contributing you agree that your work is released under the [MIT license](LICENSE).
