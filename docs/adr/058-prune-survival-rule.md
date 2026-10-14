# ADR-058: The 0.20.0 prune: consumer evidence decides what survives

**Status:** Accepted, retroactive (decided 2026-10-01; recorded 2026-10-13 from commit and PR history). Extends ADR-031 (the disposition table is not repeated here), ADR-034 (date pickers) and the 2026-10-01 amendment to ADR-014 (pre-1.0 removals ship in a minor).

## Context

On 2026-09-30 Adrian said, in the words hds#389 quotes: "the design system is a bit bloated,
let's hack away at it once the current burndown lands; do an aggressive prune audit and
spec buildout." hds#133 option A had just been closed with "keep every exported
component", and hds#254 had been ratified on 2026-09-26. Its folds waited for 1.0.

hds#389 measured the library at 118 exported component modules and 926,442 B for root plus
`/patterns` (minified). It put the measured consumers at ops (23 names in 32 files) and
folio (`variables.css` only). The issue says where the bytes were: CommandPalette inlined
the 359,239 B manifest, ComponentInstanceMatrix pulled in `component-api.json`, and the date
family (96,388 B) bundled date-fns and react-day-picker.

## Decision

Decide the prune as one Decision issue with a default and a date, and let consumer
evidence decide what survives.

- **Survival rule (D2).** An export survives if it is in the core set, or a measured
  consumer imports it, or a shipped consumer prompt names it, or it is a screen pattern
  with a named adoption target. A fold happens only when the survivor exists and "can
  express the folded component". Removed code comes back "only through a Work issue that
  names its consumer".
- **Codemod or nothing (D7).** A name any consumer imports is removed only with a codemod
  (`--check`, `--dry-run`, fixtures) whose dry-run diff is filed on the consumer repo. "HDS
  never pushes to consumers." Names with no consumer need no codemod.
- **Refuters before ratifying.** Three review lenses attacked the batches. They found 16
  named survivors in the first proposal "that do not compile today" (Button pressed, Badge
  dot, Progress circular, Card selectable, Combobox multiple, Input date/time/file,
  Tabs.List, Avatar.Group, StatusTile layout, Dialog tone). They found that dot access
  such as `Card.Header` throws in a React Server Component, because the root chunk is
  `"use client"`. The policy keeps the named compound parts (D9).
- **Ratified 2026-10-01** by Adrian: option A with D1 to D10. Same day, "remove now; still
  no 1.0". Removals ship as breaking changes in 0.20.0. The 1.0 cut is parked until Adrian
  says go. The issue comment says the earlier "nothing removed before 1.0" "misread
  Adrian's constraint".
- **One breaking release.** No Version Packages PR merges until R1, B3 and B4 have landed.

## Alternatives considered

hds#389 listed four options.

- **B, the first proposal as filed.** About 51 modules and 190 kB. Lost because Alert and
  Card cannot express Callout and Stat, and the named parts Server Components need were
  dropped. It also needed 6 codemods over 10 ops files.
- **C, keep option A.** No new ops work, but the bundle stays near 926 kB.
- **D, data-only prune.** About 627 kB less, core untouched. Not chosen.
- Deprecate in 0.x and remove at 1.0 was the default on 2026-10-01. The follow-up
  comment replaced it with removal in 0.20.0.

## Rationale

- The issue states the shape: scan consumers, then cut what none imports, and migrate the
  rest with tooling. The scans on 2026-10-01 found site-engine with no dependency and
  concrete importing only `variables.css`. "Ops is the only consumer these removals
  affect."
- Ops pins `^0.19`, "which never resolves to 0.20, so nothing breaks until ops chooses to
  upgrade."

## Consequences

- Landed in order: `a9ece9a` (PR #414) deleted unexported dead code and docs-tooling.
  `ecb0a04` (PR #435) removed 97 root names and took the main entry "96.5 -> 48.45 kB
  gzip". `b2e27a2` (PR #437) removed 32 components and the date pickers. `69e0049` (PR #441)
  removed 13 components that fold into survivors. `aa07aab` (PR #443) added codemods for
  NotFoundPattern and TileGrid and removed them, with an ops dry run of "4 codemods, 14
  files". `57de36b` (PR #439) dropped five runtime dependencies (three Radix packages,
  date-fns, react-day-picker). `7c86aec` (PR #444) deleted orphaned docs-nav data.
  `5d7c98c` (PR #530) removed StatusDot for 0.21.0.
- A safety net failed once. hds#434: `patterns-subpath --check` "no longer passes while a
  removed name remains" (`3bf41cb`, PR #440). The check had passed while a removed name was
  still imported. The fix added red-first tests (40) and stricter source reading.
- `removed-0.20.json` lets `--check` name the survivor for each removed name.
- ADR-014 was amended twice: removals in a 0.x minor, then removal with a manual step
  (hds#465). On origin/main `codemods/` holds the codemods named here.

## Lessons

- Count consumers before cutting. The rule "a measured consumer imports it" turned an
  opinion about bloat into a list.
- Review a prune plan with refuters before ratifying. They found survivors that did not
  compile and a Server Components failure that the author's checks could not.
- A migration check is only as good as its parser. Test `--check` against inputs that
  still contain the removed name.
- Remove everything in one breaking release, not several.

## Evidence

- hds#389: Decision: prune the public API to what consumers use at 1.0 (Adrian's decision and update comments, 2026-10-01)
- `a9ece9a` refactor(prune): delete unexported dead code, docs-tooling and dead theme.css families (PR #414)
- `ecb0a04` feat(prune)!: remove the deprecated root API in 0.20.0 (PR #435)
- `b2e27a2` feat(prune)!: remove the 32 wave 4a components and the root \*Variants (PR #437)
- `57de36b` chore(deps): drop five runtime dependencies the 0.20.0 removals left unused (PR #439)
- `69e0049` feat(components)!: remove the 13 wave 4b components that fold into a B3 survivor (PR #441)
- `aa07aab` feat(prune)!: codemods for NotFoundPattern and TileGrid, then remove them (PR #443)
- `7c86aec` chore(prune): delete the orphaned docs-nav data (PR #444)
- `3bf41cb` fix(codemods): patterns-subpath --check no longer passes while a removed root name remains (PR #440, hds#434)
- `5d7c98c` feat(prune)!: remove StatusDot for 0.21.0 (PR #530)
