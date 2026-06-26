# HDS Loop Engineering

_Designing the loop that runs the agent — not prompting the agent._

This is the HDS-specific autonomous-loop setup. The premise (from the
"loop engineering" school): you stop hand-prompting and instead design a
**loop** — _do work → mechanically check it → repeat_ — around a **separate,
deterministic verifier**. The non-negotiable rule:

> An unattended loop without a verifier is a machine that ships bugs with high
> confidence. If "done" can't be expressed as a check a separate process runs
> mechanically, the task is **not** ready for autonomous execution.

HDS is unusually well-positioned for this because it already has the hard part —
a best-in-class deterministic verifier (the guardrail gate system). What was
missing was the loop wiring. This document is that wiring.

---

## The pieces (and what's reused vs. new)

| Piece                                                                 | Role                                                                                                                                                                  | Status           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `docs/guardrails/registry.json` + `scripts/run-gates.mjs --gate <id>` | **The verifier.** 64 deterministic gates, each a pure observer with proven fixtures.                                                                                  | reused           |
| `pnpm typecheck` / `test:a11y` / `test:layout` / `lint` / `build`     | Mechanical verifiers that aren't single gates (a suite is still a clean pass/fail).                                                                                   | reused           |
| `scripts/dispatch-pod.mjs verify`                                     | **Isolation guard.** A dispatched agent confirms it's on a real worktree before committing (worktree isolation has leaked before).                                    | reused           |
| The `Workflow` tool (Dynamic Workflows)                               | **The loop runtime.** Claude authors a JS orchestration script; a background runtime runs it; loops/branches/verification live in script variables, not model memory. | reused (harness) |
| `docs/ai/orchestration.json`                                          | **Backlog + verifier contract.** Each unit declares its mechanical acceptance checks.                                                                                 | new              |
| `scripts/loop/orchestration-lib.mjs`                                  | **Deterministic core** (pure): contract validation, priority selection, legal transitions, atomic state writes. Unit-tested.                                          | new              |
| `scripts/loop/loop-cli.mjs`                                           | Operator/agent CLI: `validate · next · status · claim · done · park`.                                                                                                 | new              |
| `scripts/loop/hds-loop.workflow.js`                                   | **The loop runner** — a `Workflow` script: implement-in-worktree → independent verify → recommend transition.                                                         | new              |
| `scripts/__tests__/loop-orchestration.test.mjs`                       | Proves the harness itself (the part you must trust) is correct.                                                                                                       | new              |

A deliberate non-choice: we did **not** vendor a multi-agent framework
(`ruvnet/claude-flow` etc.) — evaluated and rejected (over-scoped, needs
outbound network + API key the sandbox blocks, trips strict gates). The native
`Workflow` runtime _is_ the Dynamic-Workflow capability the approach calls for.

---

## The verifier contract

Encoded as data in `orchestration.json` and enforced by `pnpm loop:validate`
(`scripts/loop/orchestration-lib.mjs#validateContract`):

- A unit is **autonomous-eligible** only if `status:"backlog"`, `humanOnly !== true`,
  and **every** entry in `acceptanceChecks` resolves to a runnable verifier.
- `acceptanceChecks` use a string DSL so the file stays human-diffable:
  - `"gate:<registry-id>"` → `node scripts/run-gates.mjs --gate <id>`
  - `"pnpm:<script>"` → `pnpm <script>` (allow-list: `typecheck`, `lint`, `test`,
    `test:layout`, `test:a11y`, `build` — deterministic only)
- A task that **can't** name a mechanical check is marked `human-only`. This is
  a feature, not a gap: in the seed, `#11 asChild/Slot` (architectural) and
  `#19 doc-canon` (editorial judgement) are `human-only` precisely because no
  gate can prove them. `#22 aria-label` shipped via `typecheck` + `test:a11y` —
  its honest acceptance checks, recorded as a worked example.

If a unit ever appears in `backlog` without a resolvable check,
`pnpm loop:validate` exits 1 and the loop refuses to start.

---

## The loop

```
pnpm loop:validate          # contract holds, or stop
        │
   pnpm loop:next            # highest-priority eligible unit (P0→P3, stable)
        │
   loop:claim <id>           # backlog → claimed (atomic, bumps attempts)
        │
   Workflow(hds-loop.workflow.js, { unit })
        ├─ Implement: ONE worktree agent edits per brief,
        │             runs `dispatch-pod verify`, runs the acceptance
        │             commands, commits to its worktree branch
        └─ Verify:    a SECOND agent re-runs the SAME commands on that
                      branch — we never trust the implementer's self-report
                      (roadmap 13g-8: no voluntary self-audit)
        │
   loop:done <id>  (verified)  |  loop:park <id> (failed / attempts exhausted)
        │
   repeat
```

Selection and state transitions live in the **tested Node layer**, not in the
Workflow sandbox (which has no filesystem access). The Workflow orchestrates the
_agents_; `loop-cli` records the _state_. Verification is done by the gate/test
commands (objective exit codes), independently re-run — the agent only invokes
them.

---

## Safety rails (mapped to the known failure modes)

| Failure mode                  | Control here                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Token cost compounds silently | `Workflow` `budget` ceiling; loop exits when `budget.remaining() < 60k`. `orchestration.budget.tokenCeiling` documents the per-run cap. |
| Loop ships bugs confidently   | **Verifier contract**: no dispatch without a resolvable mechanical check. Independent re-verify on the committed branch.                |
| Runaway / stuck unit          | `maxAttempts` (default 2) → `parked` for human review. `perUnitWallClockMin` documents the watchdog cap (see Promotion).                |
| Worktree cross-pollination    | `dispatch-pod verify` before every commit; implement agent runs in `isolation:"worktree"`.                                              |
| Self-audit theatre            | Implementer and verifier are **different agents**; the verifier re-runs the checks from a clean checkout.                               |
| State corruption mid-write    | `saveOrchestration` writes `tmp` + `rename` (atomic). Transitions are validated; illegal ones throw.                                    |

---

## Turning it on

**In this sandbox** you can author, unit-test, and run a _single_ validation
pass (the `Workflow` runtime works in-session). What you **cannot** do here is a
fully unattended overnight loop: that needs an API key + outbound network the
environment blocks (the same reason `gitleaks` is absent). The loop is therefore
**built and tested here, run autonomously on your machine / a configured env.**

```bash
pnpm loop:validate                      # 1. contract holds
pnpm loop:next                          # 2. see what's up next
# 3. dispatch (Claude Code session): invoke the Workflow tool with
#    scriptPath: scripts/loop/hds-loop.workflow.js, args: { unit: <the unit> }
#    Start with the `loop-smoke` unit and { dryRun: true } to prove the path.
node scripts/loop/loop-cli.mjs done <id>   # 4. record after independent verify
```

`loop-smoke` exists exactly for step 3's first run: it makes no product change
and verifies only `pnpm:typecheck`, so you can confirm select→dispatch→verify→
record end-to-end before pointing the loop at real work.

**Worktree bootstrap (learned from the first PoC run).** A fresh `git worktree`
has no `node_modules` and none of the **gitignored generated artifacts**
(`src/app/data/component-api.json`, `used-icons.json`, `token-audit-report.json`),
so `typecheck`/tests fail there until the worktree is bootstrapped. The runner
now instructs the implement agent to run `pnpm install` then
`pnpm manifest:generate && pnpm icons:sync && node scripts/audit-tokens.mjs`
before verifying. The PoC correctly _parked_ `loop-smoke` on a `typecheck`
exit 2 for exactly this reason — the verifier refusing to pass an unbuildable
checkout is the safety rail working, not a harness bug.

---

## Testing

- `pnpm test scripts/__tests__/loop-orchestration.test.mjs` — 19 cases over the
  contract, selection ordering, transition legality, and that the **seeded
  `orchestration.json` satisfies its own contract against the live registry**.
- `pnpm loop:validate` runs in CI/pre-commit-adjacent flows as a fast guard.

---

## Promotion path (not built yet — deliberate)

Kept out of v1 to stay small and reversible. Each is a clean follow-up:

1. **Register `loop:validate` as a pre-commit gate** (needs a violating/passing
   fixture pair per the proof-of-firing harness) so backlog drift is caught.
2. **Watchdog** (`perUnitWallClockMin`, cost ceiling, park-after-N) — the
   roadmap's `swarm-watchdog` idea, scoped to this loop.
3. **Learned-rules pipe**: a `parked` unit's failure → `docs/ai/learned-rules.jsonl`
   → candidate new gate, so every miss ratchets the verifier (roadmap 13g-13).
4. **Strength hook**: regenerate `pnpm strength` after each loop run so the next
   run boots with current state.
