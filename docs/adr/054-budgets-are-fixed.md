# ADR-054: Bundle budgets are fixed; fix the side effects instead

**Status:** Accepted, retroactive (decided 2026-09-30; recorded 2026-10-13 from commit and PR history). Extends `docs/architecture/ADR-0003-bundle-budget.md`.

## Context

`docs/architecture/ADR-0003-bundle-budget.md` set warn-mode budgets in May 2026. By
September `.size-limit.cjs` was hard-fail, and several entries had been re-baselined
when content grew (the manifest entry, the main entry). Each re-baseline was justified
in the file and approved by Adrian.

On 2026-09-29, `43fd957` (hds#315, PR #326) added one more budget. Nothing stopped the
barrel's shared graph "from growing under a consumer who imports one component". The
new probe bundles `import { Button }` from the built root entry, tree-shaken, with
react external. It was measured at 113.01 kB gzip and budgeted at 119 kB (+5%).

The next day the probe failed. A PR for usage contracts (hds#340, PR #362) landed
the Button-only bundle at "121.79 kB gzip against the 119 kB limit". The cause was
side effects at module top level in `CommandPalette`: a trailing
`CommandPalette.displayName = ...` write, and bare `cva()` and `React.forwardRef()`
calls. A bundler cannot prove those are removable, so a Button-only consumer kept the
component and the whole inlined manifest. Every manifest addition then landed on the
Button budget.

## Decision

Keep the 119 kB Button-only budget where it is and remove the side effects.

- Annotate top-level `forwardRef`, `cva`, `createContext` and `withHdsPortal` calls as
  pure. Set `displayName` inside a pure `Object.assign` instead of by a later write.
- Assemble compounds (AlertDialog, Dialog, Card, Grid, then ContextMenu, Menu, Popover,
  Toolbar, Tooltip, HoverCard) with one pure `Object.assign` around a wrapper of our own.
  Stop writing parts onto the Radix Root export.
- Add `scripts/check-pure-annotations.mjs` as a pre-commit gate. `hds#365` extended it
  to flag a bare `Object.assign(<Component>, ...)` and any top-level `X.Part = ...` or
  `X.displayName = ...` write.
- Add an esbuild Button-only bundle to `scripts/build-button-probe.mjs`. It fails if a
  `@radix-ui` package outside an allow-list reaches the bundle.

`CLAUDE.md` states the rule: "Never raise a budget to get green." The header of
`.size-limit.cjs` says the same: raising a limit "needs Adrian's approval, never a way
to get a branch green", and a failure is a performance-optimization task first.

## Alternatives considered

Raising the 119 kB limit is the obvious alternative. The commits do not discuss it for
this budget. The other budgets show a distinction: the manifest and main entries were
raised only when content grew, with Adrian's approval, and the 2026-09-24 main-entry
raise was later undone by moving the corpus out of the bundle (hds#279).

## Rationale

- The overshoot came from side effects, not from features. The fix removed them and
  left behaviour and exports unchanged ("Behaviour and exports are unchanged").
- Rollup and esbuild disagree. `2d8c1b6` notes that "the rollup number alone cannot see
  a property write on a Radix export, rollup drops it, webpack and esbuild keep it".
  A consumer on webpack or esbuild would pay for what the rollup probe hid.
- A gate on the source pattern catches the cause before the size check does.

## Consequences

- Measured results, all with the budget unchanged:
  - hds#358 broke the budget again, and six `AlertDialog` `forwardRef` calls were marked
    pure in `dbba2c7` to fix it.
  - `2d8c1b6` (hds#363, PR #367): rollup Button-only probe 62.20 kB to 31.62 kB gzip.
  - `31a9c67` (hds#365, PR #382): esbuild probe 85.58 kB to 42.11 kB gzip, and
    `@radix-ui` packages reached 33 to 2 (react-slot and react-compose-refs).
- `1a3e4a4` released 0.19.1 with "compound components no longer mutate the Radix Root
  export".
- On origin/main the Button-only entry is still budgeted at 119 kB, and
  `check-pure-annotations` still runs in `.husky/pre-commit`.
- Compounds now have a fixed construction shape. Writing `Foo.Bar = ...` fails
  pre-commit, with no annotation to waive it.

## Lessons

- A size budget measured with one bundler can pass while another bundler ships the
  bytes. Probe with more than one.
- When a budget fails, find the line of code that causes the bytes. The 121.79 kB
  overshoot was one `displayName` write and a few bare calls, not 3 kB of features.
- Gate the cause in source (pre-commit) as well as the symptom in CI. The rollup probe
  passed while the esbuild probe still listed 33 Radix packages.
- Fixing the same class of defect twice (hds#363, then hds#365) is the signal to write
  the gate, not to fix the third instance by hand.

## Evidence

- `43fd957` feat(credibility): strict TS, bare component exports, pnpm test in pre-push, Button size budget (PR #326)
- `e8dba56` docs(components): author remaining core usage contracts and enforce check-contract-coverage (PR #362), body records 121.79 kB vs 119 kB
- `dbba2c7` feat(patterns): DestructiveSection, DataTableSection ... (PR #358), six AlertDialog calls marked pure
- `2d8c1b6` fix(bundle): pure compound assembly, check-pure-annotations gate, esbuild Button probe (PR #367)
- `31a9c67` fix(bundle): pure compound assembly for the last six compounds, and a gate for the write shape (PR #382)
- `1a3e4a4` Version Packages, 0.19.1 (PR #368)
- hds#315, hds#363, hds#365; `.size-limit.cjs` header; `CLAUDE.md` skill protocol
