# After-arm run notes (2026-10-07)

Conditions: `eval/consistency/CONDITIONS.md`, after arm. Package packed from
`ff73142` (claude/agent-ready-1eujo1, PR #519); harness tarball sha256
`bee42586…c08c`.

## Result vs the 2026-10-05 baseline

| Measure | Baseline | After | Threshold |
| --- | --- | --- | --- |
| Builds first try | 3/3 | **2/3** (after-haiku: tsc failed) | 3/3 |
| Violations | 0 | 0 | 0 |
| axe serious/critical | 0 | 0 | 0 |
| Jaccard, min pair | 0.4091 | **1.0** (all three pairs) | >= 0.85 |
| Light diff, max pair | 3.2096% | not measured (haiku did not build); opus~sonnet **0%** | <= 1.5% |

**Verdict: FAIL** on builds, so the harness wrote no ledger entry for the full
run. The component-set result is the headline: every generator picked the same
components (Jaccard 1.0, up from 0.41), and the two that built render
pixel-identical in light and dark (0% diff).

## Deviations from CONDITIONS.md (read before quoting these numbers)

1. **No `hds` MCP server.** The generators ran as Claude Code subagents of the
   coordinating session, which cannot attach a per-subagent MCP server. They
   had AGENTS.md, llms.txt and the lint plugin's rules as files; the MCP server
   is untested by this run. All three said so in their replies.
2. **after-haiku broke the prompt's rules.** It ran shell commands (typecheck,
   eslint, build) and edited `package.json`, `tsconfig.json` and added
   `eslint.config.mjs` in its own workspace. Only `src/` is scored, so those
   edits had no effect, but its looser tsconfig is why its own typecheck passed
   while the harness's failed (3 errors: implicit `any` ×2, `useState(null)`
   narrowed to `null`).
3. **Supplementary 2-app run.** To get the pixel diff the full run could not
   measure, the harness was run again (`--skip-build`) on after-opus +
   after-sonnet only. It appended a ledger entry; that entry was removed
   before commit because a 2-app run is outside the frozen conditions. Its
   numbers are the opus~sonnet values above.
4. Package changes since the baseline beyond the four after-arm pieces (listed
   per CONDITIONS.md): the #519 usage-tag edits to AlertDialog and Dialog, and
   the Stat / StatusTile / Card.Metric usage text pointing at MetricTiles.

## What to fix next

- Haiku's three type errors are the kind a typed example in AGENTS.md (state
  with an explicit type, typed event handlers) would prevent.
- Re-run with the MCP server attached from separate sessions, one per
  generator, to test the fourth piece.
