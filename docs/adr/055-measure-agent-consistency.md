# ADR-055: Measure agent consistency, with frozen thresholds

**Status:** Accepted, retroactive (decided 2026-09-30, conditions frozen 2026-10-05; recorded 2026-10-13 from commit and PR history). The measurement stands. Its role changed on 2026-10-11 (see Consequences).

## Context

The design system's stated customer is an agent that builds screens from the public
docs. In late September, reviews on 2026-09-28 and 2026-09-29 had three agents build
the same Client-detail screen. `1cd40ca` records the result: "Three independent agents
given the same client-detail spec produced screens with identical tokens but different
composition (tile height 132/84/80, page title 30 vs 48, Save left or right)". The
tokens were consistent. The layer above them was not.

Those reviews left nothing committed. `1316ae8` says: "no way to re-run it, no ledger,
no number in README or status.json."

## Decision

Treat agent consistency as a number that is measured on the same terms each time.

- **Fix the layer above the tokens** (2026-09-30). `1cd40ca` added the PageHeader,
  MetricTiles and FormActions screen patterns. `dbba2c7` added DestructiveSection and
  DataTableSection. `91849c7` and `e8dba56` added usage-contract JSDoc tags (`@usage`,
  `@whenNot`, `@useInstead`, `@keyboard` and others). They flow into the manifest,
  `llms.txt` and `component-api.json`, and `check-contract-coverage --enforce` runs in
  `.husky/pre-commit`. `e31ea5f` generates a consumer `SKILL.md`. `6596b2d` ships
  `llms.txt`, `DESIGN.md`, `CONSUMING.md` and `component-api.json` in the package.
- **Measure it.** `pnpm eval:consistency` (`1316ae8`, hds#343; live half `41120dc`,
  hds#344) scores builds, token violations, axe, component-set Jaccard and light-mode
  pixel diff. Results go to an append-only ledger.
- **Do not soften thresholds.** The ledger was seeded with both review runs as
  `source: review`, `pass: false`, with "thresholds not softened". The limits are builds
  3/3, violations 0, axe 0, Jaccard at least 0.85, light diff at most 1.5%.
- **Freeze the conditions** (`5053c75`, hds#504). `eval/consistency/CONDITIONS.md` fixes
  the screen, two arms, three generators, the verbatim prompt and the thresholds: "Change
  nothing here between the two runs." The baseline arm gets the installed package only.
  The after arm adds `AGENTS.md`, `llms.txt`, the `hds-mcp` server and an ESLint plugin
  (`def444a`, hds#519; run in `cb3347f`, hds#528).

## Alternatives considered

None recorded at the time.

## Rationale

- Without a committed number, the wave-2 fixes had no baseline "to be measured against"
  (`1316ae8`).
- Honest thresholds keep the output useful. The README says: "The baseline misses its
  thresholds, and they stay where they are: the useful output is where the agents
  diverge, which points at the docs to fix next."
- Frozen conditions make a before and after comparison valid. If a condition must
  change, CONDITIONS.md says to record a new baseline first.

## Consequences

- The first harness run built none of the three apps. The spec asked for `src/App.tsx`
  without saying how it exports. All three agents used a default export and `main.tsx`
  imported the named one (`41120dc`). The spec gap was fixed in the harness. That run
  has no ledger entry.
- Ledger Jaccard minimums: 0.71 (2026-09-28), 0.68 (2026-09-29), 0.7368 (2026-09-30
  harness), then 0.4091 on the frozen baseline of 2026-10-05, with light diff 3.2096%.
  The baseline run diverged because one generator never found the `/patterns` subpath
  (`def444a`).
- After arm, 2026-10-07 (`eval/consistency/runs/2026-10-07/NOTES.md`): Jaccard 1.0 on all
  pairs, builds 2 of 3 (haiku failed `tsc`), verdict FAIL, no ledger entry for the full
  run. The two apps that built rendered at 0% diff. The `hds` MCP server was untested,
  because the subagent generators could not attach one.
- `389ceda` (2026-10-11) moved the eval into the README's "Open explorations". It says
  the eval "measures the docs rather than gating merges or constraining agents". The
  README still says this on origin/main. The latest ledger entry there is the
  2026-10-05 baseline, so the after-arm result is in NOTES.md only.

## Lessons

- Identical tokens do not give identical screens. Consistency needs rules for
  composition, such as which component for which job, and a measured score.
- Freeze thresholds and conditions before the first comparison run. Then a miss
  reports a gap in the docs, not in the bar.
- Write the spec for a literal reader. One unstated choice (default or named export)
  failed all three builds.
- An eval that cannot attach the tool under test (here the MCP server) reports on the
  other pieces only. Record that in the notes.

## Evidence

- `1cd40ca` feat(patterns): PageHeader, MetricTiles, FormActions ... (PR #352, hds#337)
- `1316ae8` feat(eval): add pnpm eval:consistency offline measuring core (PR #351, hds#343)
- `41120dc` feat(eval): wire the eval:consistency live half and record the first harness run (PR #361, hds#344)
- `91849c7` feat(docs): contract JSDoc tags into manifest, component-api and llms.txt (PR #357)
- `e8dba56` docs(components): author remaining core usage contracts and enforce check-contract-coverage (PR #362)
- `e31ea5f` feat(skill): generate a drift-gated consumer SKILL.md (PR #353)
- `6596b2d` feat(package): ship agent context in the tarball (PR #359)
- `dbba2c7` feat(patterns): DestructiveSection, DataTableSection ... (PR #358)
- `5053c75` eval: freeze AI-ready test conditions and record a fresh baseline (PR #504)
- `def444a` feat(agents): ship AGENTS.md, the hds-mcp server and the ESLint plugin (PR #519)
- `cb3347f` eval: after-arm run, component-set Jaccard 0.41 to 1.0 (PR #528)
- `389ceda` docs: README 'Open explorations' section (PR #608)
