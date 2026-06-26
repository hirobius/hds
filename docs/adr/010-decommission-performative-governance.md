# ADR-010: Decommission the Performative Governance Surface

**Status:** Accepted (2026-06-26)

## Context

The guardrail/governance layer had accreted a meta-tier that measured and audited the
discipline itself rather than the product. Registry telemetry showed the cost was real
and the value was not: a cluster of gates had **never fired and never caught a single
violation** in their lifetime, and a "Score A/B" strength apparatus graded the system's
own house-keeping.

Specifically:

- 8 gates with `lastFiringAt: never` / `lastViolationAt: never`:
  `audit-gate-replaceability`, `check-fixture-stubs-ratchet`, `audit-strengths`,
  `audit-soft-gates`, `audit-figma-system`, `check-route-smoke`,
  `check-snapshot-staleness`, `generate-strength-report`.
- The strength scoreboard (`generate-strength-report` + Score A/B + `SYSTEM_OVERVIEW.md`
  - `strength-*` docs) — a system grading its own discipline.
- `docs/SYSTEMS-LOG.md` — an auto-generated "append-only ledger" (2 machine-written
  health-sync entries across ~50 commits) that is **not wired to any commit hook** and
  duplicates information already in git history.

The repo's own roadmap anticipated this (`13g-33`: "if discipline cost > 25% of total,
we're hardening at the expense of shipping"). The meta-tier had crossed that line.

## Decision

Remove the performative governance surface and rely on the artifacts that already work:

- **Delete the 8 never-fired gates** (scripts + fixtures + registry entries + `pnpm`
  scripts + the `strengths-audit` CI workflow). Registry: 64 → 56 gates.
- **Delete the strength scoreboard** (generator, Score A/B, `SYSTEM_OVERVIEW.md`,
  `strength-score-spec.md`, `strength-report.md`, `strength-history.jsonl`).
- **Retire `docs/SYSTEMS-LOG.md`** and the journal/health-sync generators
  (`update-journal.mjs`, `sync-system-health.mjs`, `health-log`/`sync:health`).
- The **product-facing gates stay** (types, lint, a11y, layout, tokens, deprecations,
  manifest, and the registry/wiring/fixture meta-validators that have caught real drift).

## Rationale

- A gate that has never fired in its lifetime is pure overhead with negative signal.
- Self-grading scores are "marking your own homework" — they measure the measurer.
- The real progress/decision record is **git history + `CHANGELOG.md` + ADRs**, all of
  which already exist and record correctly. The auto-ledger never did.

## Consequences

- Registry at 56 gates; fixture proof-of-firing becomes 56/56 real, 0 stub (the 6
  remaining stubs all belonged to removed gates).
- Less noise: no more strength churn, no more auto-`SYSTEMS-LOG` to revert each build.
- Decision history moves from an auto-generated costume into ADRs (this file et al.).
- Loss accepted: the self-score dashboard is gone. It was never load-bearing.

## References

- ADR-011 (loop engineering) — the verifier-gated successor to ad-hoc discipline.
- `HARDENING_ROADMAP.md` `13g-33` (discipline-vs-feature cost tracking).
