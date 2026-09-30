# Agent consistency harness

Measures whether different agents, given only the public HDS documentation,
build the same screen the same way. This directory holds the screen spec, the
dated ledger and the offline fixtures. The measuring code is in
`scripts/lib/consistency/` and the CLI is `scripts/eval-consistency.mjs`.
The script never calls a model.

## What is measured

| Measure                                              | Threshold |
| ---------------------------------------------------- | --------- |
| Builds and type-checks on first try                  | 3 of 3    |
| Raw hex, px, Tailwind, raw HTML controls, custom CSS | 0         |
| axe serious and critical, light and dark             | 0         |
| Component-set Jaccard, every pair (minimum)          | >= 0.85   |
| Pixel diff at 1280 wide, light, every pair (maximum) | <= 1.5%   |

Dark pixel diff and the inked-pixel variant are reported but not gated. The
thresholds live in `ledger.json` and are not softened to make a baseline pass.

n = 3 is a sample. One failing run may be noise, so read the trend across
ledger entries, not a single row.

## Supplying apps

The harness never calls a model. Its input is a directory with one folder per
generated app:

```text
eval/consistency/runs/<YYYY-MM-DD>/<app-id>/src/App.tsx   (plus any extra files under src/)
```

Only `src/` is read. `main.tsx`, `index.html` and everything else come from
`template/` (below), so a generated app cannot change the `data-hds` /
`data-theme` scope, the stylesheet import or the build config; a `src/main.tsx`
in an app is ignored and reported.

To produce three apps, give each generator its own fresh context and only the
inputs the spec allows (`specs/client-detail.md`, "Allowed inputs"):

1. **By an agent.** Start three separate sessions, one per app id, each with a
   working directory that holds only the allowed inputs (the files the spec
   lists, with the shipped `.d.ts` files under
   `node_modules/@hirobius/design-system/dist/types/`, taken from the tarball),
   no shell and no web access, and this prompt:

   > Read `eval/consistency/specs/client-detail.md` and build the screen it
   > describes. Use only the inputs it lists as allowed. Write your app to
   > `eval/consistency/runs/<date>/<app-id>/src/` with `App.tsx` as the entry.
   > Do not read any other app under `runs/`.

   Copy each app's `src/` into `runs/<date>/<app-id>/src/` in this repository.

2. **By hand.** Build the screen in the spec three times and drop each under
   `runs/<date>/<app-id>/src/`.

`runs/` is gitignored and prettier-ignored; `git add -f` a run only when it
backs a ledger entry.

## The template

`template/` is a minimal Vite + React + TypeScript app. `src/main.tsx` owns the
documented scope, `<div data-hds data-theme={theme}>`, with `theme` read from
`?theme=light|dark`, and imports `@hirobius/design-system/tokens.css`.
`src/App.tsx` is a placeholder that every generated app replaces; `main.tsx`
mounts it whether it exports the component as `default` or as `App`. The template
does not depend on the design system: the harness installs the packed tarball
into a copy of it.

## Running

```sh
pnpm eval:consistency -- --help
pnpm eval:consistency -- --apps eval/consistency/runs/<date>
pnpm eval:consistency -- --apps eval/consistency/runs/<date> --skip-build
pnpm eval:consistency -- --apps eval/consistency/runs/<date> --offline
pnpm eval:consistency -- --summary
```

A full run (`--apps <dir>`, no `--offline`) needs network access to the npm
registry and Chromium (`PLAYWRIGHT_BROWSERS_PATH`, `/opt/pw-browsers` in remote
sessions). It:

1. runs `build:lib` and `npm pack`, records the tarball sha256 and the git
   commit (`--skip-build` reuses the tarball a previous run left in
   `reports/consistency/pack/`);
2. installs that tarball and the declared peers into a copy of the template for
   each app, so an app is built against what a consumer gets, not the source
   tree;
3. runs `tsc --noEmit` and `vite build` for each app;
4. serves each build and screenshots it at 1280x800 light, 1280x800 dark and 390
   wide (full page, motion frozen, fonts loaded) into
   `reports/consistency/<date>/`;
5. axe-scans each app in light and dark (WCAG 2.0 to 2.2 A and AA rules, the same
   engine and rule sets as `scripts/check-storybook-axe.mjs`);
6. pixel-diffs every pair of light PNGs, and every pair of dark PNGs for the
   ledger detail;
7. judges all five thresholds, appends a `source: "harness"` entry to
   `ledger.json` and exits 0 or 1 from the result.

If an app does not build, the run exits 1 and writes no ledger entry: nothing
can be rendered or scanned for it, so the other figures would describe a
different set of apps. Input under `fixtures/` never writes a ledger entry.

`--offline` computes violations and Jaccard from source and checks only those
two thresholds. It needs no network or browser and never writes a ledger entry.
A full run takes a few minutes, most of it the three `npm install`s.

Exit 0: every threshold passes. Exit 1: a threshold failed (named, with the
measured value against the limit). Exit 2: usage, input or environment error,
such as an unreachable registry (the message names the fix: the network or
proxy, or `--offline`).

`pnpm test` runs none of this: it imports only the pure modules and runs the
orchestration with its stages replaced by fakes.

## Ledger

`ledger.json` is append-only: a `thresholds` block and dated `entries`. Each
entry records the date, source (`review` or `harness`), package version,
tarball sha256 (null for review runs), git commit, app ids, measured figures,
the thresholds in force and a pass flag. A harness run rounds each figure to
four places before judging it, so the recorded number is the one the pass flag
was decided on. The two seeded entries are the
2026-09-28 and 2026-09-29 review runs; neither recorded a tarball hash or a
commit, and both fail the Jaccard and light pixel diff thresholds. The
harness entries after them come from `pnpm eval:consistency` and record the
sha256 the run printed.

`node scripts/check-status-claims.mjs --check` fails when root `status.json`
(`consistency`) or the README "Agent consistency" line differs from the latest
entry.

## Fixtures

`fixtures/pass/` (three apps, identical imports, no violations),
`fixtures/fail/<case>/` (one set per failing source metric, plus a
comment-only hex that must not count) and `fixtures/png/` (tiny PNG pairs, one
under and one over 1.5%). They back `scripts/__tests__/eval-consistency.test.mjs`.
