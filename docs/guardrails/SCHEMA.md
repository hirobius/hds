# Guardrail Registry Schema

`docs/guardrails/registry.json` is the machine-readable inventory of every
automated quality gate in the Hirobius repo.

## Top-level shape

```json
{
  "version": "1.0.0",
  "generated": "<ISO 8601 timestamp>",
  "gates": [ <GateEntry>, ... ]
}
```

## GateEntry fields

| Field            | Type                                                         | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`                                                     | yes      | Kebab-case identifier, derived from the script filename minus `.mjs`                                                                                                                                                                                                                                                                                                                                                                                          |
| `description`    | `string`                                                     | yes      | First sentence from the script's leading JSDoc block. Use `"TODO: add description"` if missing.                                                                                                                                                                                                                                                                                                                                                               |
| `severity`       | `"error" \| "warn"`                                          | yes      | `"warn"` by default; Adrian promotes to `"error"` after manual triage                                                                                                                                                                                                                                                                                                                                                                                         |
| `gateScript`     | `string`                                                     | yes      | Repo-relative path to the script, e.g. `scripts/check-focus-states.mjs`                                                                                                                                                                                                                                                                                                                                                                                       |
| `fixturePath`    | `string \| null`                                             | yes      | Path to a proof-of-firing fixture. `null` until 13g-3 wires fixtures.                                                                                                                                                                                                                                                                                                                                                                                         |
| `owner`          | `string`                                                     | yes      | Responsible party. Default: `"Adrian"`.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `source`         | `"human" \| "agent" \| "generated" \| "hermes-distillation"` | yes      | Who authored the gate: `"human"` hand-authored; `"agent"` written by an agent session; `"generated"` emitted by a generator; `"hermes-distillation"` auto-distilled. `"agent"` and `"generated"` were in use in `registry.json` before this row listed them.                                                                                                                                                                                                  |
| `firingChannel`  | `string` (enum)                                              | yes      | The primary channel that fires this gate: `pre-commit \| commit-msg \| pre-push \| ci-pr \| ci-scheduled \| pnpm-meta \| ralph-gate \| manual`. Validated against `scripts/check-validator-wiring.mjs`'s `VALID_CHANNELS`. Read by `scripts/run-gates.mjs --channel <x>` and other single-channel consumers — keep it set even when `firingChannels` is also present.                                                                                         |
| `firingChannels` | `string[]`                                                   | no       | For a gate that genuinely fires from more than one real channel (e.g. wired into both `.husky/pre-commit` AND `ralph/gate.sh`). When present, `firingChannel` must be one of its entries, and `check-validator-wiring.mjs` requires every listed channel to have independent wiring evidence — see #188.                                                                                                                                                      |
| `defaultArgs`    | `string[]`                                                   | no       | The argv a standalone runner (`pnpm guardrail:sweep`) must pass. Set it when a bare `node <gateScript>` run is NOT how the repo wires the gate — e.g. `check-token-descriptions` is only ever invoked with `--no-missing`, and bare it reports 103 MISSING descriptions the repo has deliberately chosen not to write. Leave unset when a bare run is the real contract or a superset of the sub-modes (`audit-component-integrity`, `check-link-integrity`). |

### `manual` means never auto-fires

`manual` is for a gate a human runs from the CLI and nothing else invokes. If
the gate is reachable from a `package.json` script — `pretest` above all, which
CI runs via `pnpm test` — its channel is `pnpm-meta`, not `manual`, however
rarely anyone runs it by hand.

`check-validator-wiring.mjs` used to accept `manual` for a gate it detected as
`pnpm-meta`. That allowance recorded 24 of 55 gates as operator-only tools when
they were in fact reachable from a `package.json` script. The allowance is gone;
`manual` now requires a detected channel of `none`.

Of those 24, **6 run on every PR** — `audit-component-integrity`,
`check-binding-drift`, `check-manifest-drift`, `check-registry`,
`check-source-canon`, `check-tenant-tokens` — because they sit in `pretest`,
which `.github/workflows/ci.yml` reaches via `pnpm test`. `check-source-canon`
is the costly one: registered `severity: warn, firingChannel: manual`, and
simultaneously exiting 1 on any violation in CI, so the registry said the Swiss
canon was dormant while it was blocking merges.

The other 18 are reachable only from `check:fast`, `check:full`, or their own
`pnpm run` alias, none of which CI invokes. They were mislabelled, and they are
not gating. `pnpm-meta` is the correct channel for both groups; it does not by
itself mean "blocks a PR".

Two things `firingChannel` still does not tell you:

- **`severity` is a separate axis and is not reconciled.** Several gates say
  `warn` while exiting 1 in `pretest`. Read `firingChannel` for where a gate
  fires, not `severity` for how hard.
- **`pnpm-meta` detection does not prove the script is ever run.** It matches a
  gate whose `gateScript` appears in any `package.json` script, including one
  nothing invokes. A dead alias satisfies it. Closing that needs reachability
  from a real entry point (a hook, a CI step, or `pretest`); until then
  `pnpm-meta` means "referenced by a script", not "runs".

### `ralph-gate` channel (added #188)

`ralph/gate.sh` is the fail-closed gate Ralph (the autonomous agent) must pass
before opening a PR. A gate registered with `ralph-gate` (in `firingChannel` or
`firingChannels`) must be invoked — directly, or via a `pnpm <script>` alias
whose `package.json` command runs the `gateScript` — somewhere in
`ralph/gate.sh`. `check-validator-wiring.mjs` reads `ralph/gate.sh` to verify
this the same way it reads `.husky/pre-commit` for the `pre-commit` channel.

## Adding a new gate

1. Create `scripts/check-<name>.mjs` with a JSDoc block at the top.
2. Run `node scripts/validate-guardrail-registry.mjs --update` to auto-append a stub entry.
3. Fill in `description` and adjust `severity` as needed.
4. Commit both the script and the updated `registry.json`.

## Validator

`scripts/validate-guardrail-registry.mjs` walks `scripts/check-*.mjs` and
`scripts/audit-*.mjs` and asserts every file is registered. Exit 1 with a
missing list if not. Exit 0 if clean.

Use `--update` to auto-append missing entries (stub fields, severity=warn).

Note: `--warn-only` mode is not implemented. The pre-commit hook runs the
validator directly; unregistered scripts are a hard gate. This keeps the
registry honest without a second bypass mechanism.
