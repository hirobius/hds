# ADR-027: Remove the Gate Firing Telemetry

**Status:** Accepted (2026-09-20). Extends ADR-010 (decommission the performative governance surface) to the telemetry ADR-010 itself cited as evidence.

## Context

Every registry entry carried `lastFiringAt` and `lastViolationAt`, fed by
`refresh-firing-stats.mjs` reading `docs/guardrails/firing-log.jsonl`, which
`.husky/post-commit` produced by re-running `run-gates.mjs --channel pre-commit
--emit-jsonl`. The stated purpose (HARDENING_ROADMAP, `13g-14`) was to surface
dormant gates and "distinguish perfectly clean from silently broken."

Measured on 2026-09-20, against 54 registered gates:

|                                                           |                               |
| --------------------------------------------------------- | ----------------------------- |
| Gates with real recorded firings                          | **1** — `check-contrast`      |
| Gates whose timestamp is a bulk backfill dated 2026-06-19 | **36**                        |
| Gates with `null`                                         | **18**                        |
| Entries in `firing-log.jsonl`                             | 9, every one `check-contrast` |

The log could not contain anything else. `post-commit` ran the `pre-commit`
channel only, and exactly one gate declares that channel — so 53 of 54 gates
were unmeasurable by construction, not by neglect.

Three consequences made this worse than having no telemetry:

1. **It asserted health it had not observed.** A `null` reads as "unknown"; a
   date reads as "alive in June." All 36 of those dates were written in one
   pass, so the field claimed 36 gates were exercised when none of them were.
2. **It invited false conclusions.** On 2026-09-20 a session was one step from
   deleting eight gates on the strength of `lastFiringAt: never`. Two of the
   "never fired" gates — `check-figma-mapping` and `check-code-connect` — had
   run clean that same day. The field was about to justify removing working
   gates.
3. **ADR-010 already used it as evidence.** Its removal of eight gates cites
   "`lastFiringAt: never` / `lastViolationAt: never`" — a week after the
   backfill. That decision may still have been right, but the evidence it
   leaned on was not load-bearing.

## Decision

Remove the telemetry rather than repair it.

Repairing it means emitting from every channel — CI, `pnpm-meta`, and the
manual runs that are 37 of the 54 — and then building the consumer that reads
it. That is real work in service of a dormancy dashboard for a gate set where
**three** gates fire automatically. At this size the honest way to answer "is
this gate alive?" is to run it.

Removed:

- `lastFiringAt` and `lastViolationAt` from all 54 registry entries, and their
  rows in `docs/guardrails/SCHEMA.md`
- `scripts/refresh-firing-stats.mjs` and the `guardrail:firing-stats` script
- `docs/guardrails/firing-log.jsonl` (+ `.stderr`), both already gitignored
- The `run-gates.mjs --emit-jsonl` flag, its commit-SHA resolution and
  `appendFiringLog`
- The post-commit re-run block. `orchestration-watcher` stays — it is the other
  job in that hook and is unrelated.

`--emit-inventory` stays: `closure:plan` uses it, and it disables the same
pre-commit fail-fast, so that condition now tests it alone.

## Consequences

- The registry describes what a gate **is** and where it fires, and stops
  claiming to know when it last ran. `check-validator-wiring` still proves the
  `firingChannel` matches real wiring, which is the claim that was ever checked.
- Bypass detection goes with it. A `--no-verify` push is no longer logged. It
  was only ever logged for one gate, and nothing read the log, so the loss is
  smaller than the hook's comment implied — but it is a loss, and the roadmap
  entry now says so instead of reading as shipped.
- `git commit` does slightly less background work.
- **The thing worth fixing is upstream of this.** 37 of 54 gates fire only when
  someone types the command. Telemetry measuring that would have reported a
  real problem; the fix is to wire the gates, not to watch them not run.
