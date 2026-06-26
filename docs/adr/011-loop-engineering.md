# ADR-011: Verifier-Gated Autonomous Loop ("Loop Engineering")

**Status:** Accepted (2026-06-26)

## Context

The system already had a best-in-class deterministic verifier (the guardrail gate set,
`run-gates.mjs`, fixture proof-of-firing) but no autonomous mechanism to _drive_ work
through it. The "loop engineering" approach reframes the goal: instead of hand-prompting
an agent per task, design the loop — _do work → mechanically check it → repeat_ — around
a separate, deterministic verifier. The load-bearing constraint:

> If "done" cannot be expressed as a check a separate process runs mechanically, the task
> is not ready for autonomous execution.

We evaluated and rejected vendoring an external multi-agent framework
(`ruvnet/claude-flow`): over-scoped, needs an API key + outbound network the sandbox
blocks, and would trip the strict gates. The native Dynamic-Workflow runtime already
provides the orchestration capability.

## Decision

Adopt a verifier-gated autonomous loop built on existing primitives:

- **`docs/ai/orchestration.json`** — backlog + the _verifier contract_: a unit is
  autonomous-eligible only if every `acceptanceCheck` resolves to a real gate
  (`gate:<id>`) or a deterministic `pnpm` verifier (`pnpm:typecheck|test|test:a11y|…`).
  Tasks that can't be mechanically checked are `human-only`.
- **`scripts/loop/orchestration-lib.mjs`** — pure, unit-tested core (contract validation,
  priority selection, legal transitions, atomic writes).
- **`scripts/loop/loop-cli.mjs`** — `pnpm loop:validate | next | status` + claim/done/park.
- **`scripts/loop/hds-loop.workflow.js`** — the Dynamic-Workflow runner: implement in an
  isolated worktree (guarded by `dispatch-pod verify`), then **independently** re-verify
  on the committed branch (implementer ≠ verifier; no self-audit).

## Rationale

- The verifier contract is the structural defense against "a machine that ships bugs with
  high confidence" — it refuses to dispatch the uncheckable.
- Reuses what works (gates, dispatch-pod isolation, the Workflow runtime) instead of new
  dependencies.
- The deterministic harness is itself unit-tested, because the autonomy is only as
  trustworthy as the harness around the stochastic agent.

## Consequences

- A fully unattended loop needs an API key + network the sandbox blocks, so it is
  built/tested here but run autonomously on a developer machine / configured env.
- A PoC run validated the path end-to-end (select → dispatch → isolation-verify →
  mechanical-verify → verdict) and surfaced a real prerequisite: worktrees must be
  bootstrapped (`pnpm install` + regenerate gitignored artifacts) before verification.
- New decisions about what is/isn't autonomously runnable are now encoded as data
  (the `human-only` flag), not tribal knowledge.

## References

- `docs/ai/LOOP_ENGINEERING.md` — full architecture + turn-on procedure.
- ADR-010 — the performative-governance decommission this complements.
