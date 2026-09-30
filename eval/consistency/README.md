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

Either way, the result is one directory per app:

```text
eval/consistency/runs/<YYYY-MM-DD>/<app-id>/src/App.tsx   (plus any extra files under src/)
```

1. **By hand.** Build the screen in `specs/client-detail.md` three times and
   drop each under `runs/<date>/<app-id>/src/`.
2. **By an agent.** Point three separate agent sessions at the spec, one fresh
   session per app, with this prompt:

   > Read `eval/consistency/specs/client-detail.md` and build the screen it
   > describes. Use only the inputs it lists as allowed. Write your app to
   > `eval/consistency/runs/<date>/<app-id>/src/` with `App.tsx` as the entry.
   > Do not read any other app under `runs/`.

`runs/` is gitignored; `git add -f` a run only when it backs a ledger entry.

## Running

```sh
pnpm eval:consistency -- --help
pnpm eval:consistency -- --apps eval/consistency/runs/<date> --offline
pnpm eval:consistency -- --summary
```

`--offline` computes violations and Jaccard from source and checks only those
two thresholds. Builds, axe and pixel diff are not measured and it never writes
a ledger entry. Exit 0: every measured threshold passes. Exit 1: a threshold
failed (named, with the measured value against the limit). Exit 2: usage or
input error. The live half (pinned template, build, render, axe, first harness
run) is a follow-up ticket.

## Ledger

`ledger.json` is append-only: a `thresholds` block and dated `entries`. Each
entry records the date, source (`review` or `harness`), package version,
tarball sha256 (null for review runs), git commit, app ids, measured figures,
the thresholds in force and a pass flag. The two seeded entries are the
2026-09-28 and 2026-09-29 review runs; neither recorded a tarball hash or a
commit, and both fail the Jaccard and light pixel diff thresholds.

`node scripts/check-status-claims.mjs --check` fails when root `status.json`
(`consistency`) or the README "Agent consistency" line differs from the latest
entry.

## Fixtures

`fixtures/pass/` (three apps, identical imports, no violations),
`fixtures/fail/<case>/` (one set per failing source metric, plus a
comment-only hex that must not count) and `fixtures/png/` (tiny PNG pairs, one
under and one over 1.5%). They back `scripts/__tests__/eval-consistency.test.mjs`.
