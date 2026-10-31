# Why the 2026-10-07 after-arm apps still miss a threshold

After arm: `runs/2026-10-07/` (generated 2026-10-07 against the package packed
from `ff73142`; the original run was never ledger-recorded, so this is a
rescore of the as-delivered sources against package 0.32.0 on 2026-10-31,
ledger entry 2026-10-31). One threshold still fails — builds, 2 of 3 — and it
is not one of the 2026-10-05 divergence causes.

| Measure           | Baseline 2026-10-05 | After arm (this score) | Threshold |
| ----------------- | ------------------- | ---------------------- | --------- |
| Builds first try  | 3/3                 | **2/3**                | 3/3       |
| Violations        | 0                   | 0                      | 0         |
| axe serious/crit. | 0                   | 0                      | 0         |
| Jaccard, min pair | 0.4091              | **1**                  | >= 0.85   |
| Light diff, max   | 3.2096%             | not measured †         | <= 1.5%   |

† The full run measures no pixel diff while an app fails to build. A
supplementary two-app scoring of the apps that built (fixture input, no
ledger entry) measured the opus~sonnet pair at 0% light and 0% dark — the
same 0% the pair scored in 2026-10-07.

Import sets as `scripts/lib/consistency/jaccard.mjs` reads them — identical in
all three apps (19 names: `AlertDialog`, `Badge`, `Breadcrumb`, `Button`,
`DataTableSection`, `Form`, `FormActions`, `MetricTile`, `MetricTiles`,
`Page`, `PageHeader`, `Stack`, `Tabs`, `TabsContent`, `TabsList`,
`TabsTrigger`, `Textarea`, `ToastProvider`, `useToast`); opus also imports
the `BadgeProps` type, which the component-set read does not count:

| Pair          | Jaccard | Light diff                         |
| ------------- | ------- | ---------------------------------- |
| haiku, opus   | 1       | not measured (haiku did not build) |
| haiku, sonnet | 1       | not measured (haiku did not build) |
| opus, sonnet  | 1       | 0% (dark 0%, from the two-app run) |

## Causes, largest first

1. **The after arm fixed the divergence it targeted.** Every 2026-10-05 cause
   is absent from this sample. All three generators found the `/patterns`
   subpath (cause 1) and picked `MetricTiles` + `MetricTile` for the numbers
   (cause 2), `AlertDialog` for the archive confirm (cause 3), the toast for
   the save confirmation (cause 4), `Form` + `FormActions` and no extra `Text`
   heading (cause 5). Nothing is left to diverge on pixels: the two apps that
   build are pixel-identical in light and dark, so cause 6 (gap and variant
   choices) does not appear either. Jaccard went from a 0.4091 minimum to 1 on
   every pair.
2. **The remaining failure is earlier in the pipeline: after-haiku's code
   does not type-check.** Three errors, all plain TypeScript that no HDS doc
   mentioned: `App.tsx(39,27)` implicit `any` on the save handler's `e`;
   `App.tsx(61,26)` implicit `any` on a status helper's `status`;
   `App.tsx(101,50)` a `string` passed to the setter of a `useState(null)`,
   which narrows the state to `null`. They are the same three errors the
   2026-10-07 run hit (see the run notes). Opus and sonnet wrote the same
   features typed — `useState<Project[]>`, an imported `FormEvent` type — and
   built first try. Because haiku never renders, its (identical) component
   choices get no pixel comparison and the full run's light diff goes
   unmeasured: one typing slip hides a whole measure.
3. **One after-arm piece is still untested: the MCP server.** The 2026-10-07
   generators ran as subagents of one session, which cannot attach a
   per-subagent MCP server (deviation 1 in the run notes); the 2026-10-14 run
   ran without it too. `AGENTS.md`, `llms.txt` and the lint plugin carried
   this result on their own. What the server adds is an open question, not a
   failed one.

## What happens about each

| Cause | Fix                                                                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Nothing to fix. Recorded so the next run is read against it: the docs fixes of the after arm (imports list, "Pick by need", usage contracts) held.                                                                |
| 2     | `AGENTS.md` Rules now state the strict-typing rule — explicit `useState` type when the value can be `null`, annotated handler and callback parameters (this PR, generated from `scripts/generate-agents-md.mjs`). |
| 3     | Follow-up on hds#593: a fresh generation, one session per generator with the `hds` MCP server attached, under the frozen conditions. Not this PR — the apps scored here are the as-delivered 2026-10-07 sources.  |
