# Why the 2026-10-05 baseline apps diverge

Baseline: `runs/2026-10-05/` (package 0.20.0, baseline arm). Jaccard min 0.4091,
light diff max 3.2096%. Import sets as `scripts/lib/consistency/jaccard.mjs`
reads them:

| Pair          | Jaccard | Only in the first                 | Only in the second                                                                                                                       |
| ------------- | ------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| haiku, opus   | 0.4348  | `Stat`, `Table`, `Dialog`         | `Page`, `PageHeader`, `MetricTiles`, `MetricTile`, `DataTableSection`, `Form`, `FormActions`, `AlertDialog`, `ToastProvider`, `useToast` |
| haiku, sonnet | 0.4091  | `Stat`, `Table`, `Dialog`, `Text` | `Page`, `PageHeader`, `MetricTiles`, `MetricTile`, `DataTableSection`, `FormActions`, `AlertDialog`, `ToastProvider`, `useToast`         |
| opus, sonnet  | 0.9000  | `Text`, `Form`                    | (none)                                                                                                                                   |

## Causes, largest first

1. **The `/patterns` subpath was never found (haiku).** Every pattern-tier
   component lives only in `@hirobius/design-system/patterns` since 0.20.0.
   haiku imported only from the root, so it hand-built each pattern: `Stack` +
   `Text variant="heading1"` + `Badge` for the header, `Stat` for the tiles,
   `Table` for the projects, no `Page`. That one miss accounts for 7 of the 10
   names opus has and haiku lacks, and for most of the pixel diff (no `Page`
   padding, a `heading1` title against `PageHeader`'s `heading2`, unboxed
   `Stat`s against `MetricTile` surfaces). The guidance existed (DESIGN.md
   "Which one, when", the llms.txt layout recipe) but nothing short and
   first-read said "these names import from /patterns".
2. **Four ways to show a number.** `Stat`, `MetricTile`, `StatusTile` and
   `Card.Metric` all fit "a stat tile". The `Stat` usage contract ("one
   standalone headline figure") reads as a match for each tile.
3. **Destructive confirm: `Dialog` or `AlertDialog`.** `Dialog` had a usage
   contract and `AlertDialog` had none, so the documented one won for haiku.
4. **Confirmation after save: toast or inline.** The spec says "a short
   confirmation". opus and sonnet used `ToastProvider` + `useToast`; haiku put a
   `Badge` beside the button.
5. **Form wrapper and section headings (opus vs sonnet).** opus used `Form` and
   added a `Text` heading over the notes field; sonnet used a raw `<form>` (the
   reference story `patterns-client-detail` does the same) and no heading. The
   only difference in the otherwise matching pair.
6. **Gap and button choices (pixels, not Jaccard).** `gap="px8"` against
   `gap="tight"` between row actions; `variant="secondary"` against `"tertiary"`
   for View.

## What the after arm does about each

| Cause | Fix                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `AGENTS.md` "Imports" lists the root and `/patterns` names; MCP results carry each component's `import` path; `list_core` splits them.                          |
| 2     | "Pick by need": a row of numbers is `MetricTiles` + `MetricTile`, not `Stat`/`StatusTile`/`CardMetric`; `get_component Stat` returns `insteadFor: MetricTiles`. |
| 3     | `AlertDialog` gains a usage contract; `Dialog` points to it for a destructive confirm; the guide names it.                                                      |
| 4     | "Brief confirmation after an action" is `ToastProvider` + `useToast`.                                                                                           |
| 5     | Forms are `Form` + `FormActions`; `hds/no-raw-controls` fails a raw `<form>`; headings come from pattern `title` props, not extra `Text`.                       |
| 6     | Stack gap names per level (`spacious`, `normal`, `tight`) and row actions as `variant="tertiary" size="sm"`.                                                    |
