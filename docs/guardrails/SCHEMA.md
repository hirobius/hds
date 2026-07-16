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

| Field             | Type                               | Required | Description                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                           | yes      | Kebab-case identifier, derived from the script filename minus `.mjs`                                                                                                                                                                                                                                                                                                  |
| `description`     | `string`                           | yes      | First sentence from the script's leading JSDoc block. Use `"TODO: add description"` if missing.                                                                                                                                                                                                                                                                       |
| `severity`        | `"error" \| "warn"`                | yes      | `"warn"` by default; Adrian promotes to `"error"` after manual triage                                                                                                                                                                                                                                                                                                 |
| `gateScript`      | `string`                           | yes      | Repo-relative path to the script, e.g. `scripts/check-focus-states.mjs`                                                                                                                                                                                                                                                                                               |
| `fixturePath`     | `string \| null`                   | yes      | Path to a proof-of-firing fixture. `null` until 13g-3 wires fixtures.                                                                                                                                                                                                                                                                                                 |
| `lastFiringAt`    | `string \| null`                   | yes      | ISO timestamp of last successful gate run. `null` until telemetry is wired.                                                                                                                                                                                                                                                                                           |
| `lastViolationAt` | `string \| null`                   | yes      | ISO timestamp of last violation caught. `null` until telemetry is wired.                                                                                                                                                                                                                                                                                              |
| `owner`           | `string`                           | yes      | Responsible party. Default: `"Adrian"`.                                                                                                                                                                                                                                                                                                                               |
| `source`          | `"human" \| "hermes-distillation"` | yes      | `"human"` for hand-authored gates; `"hermes-distillation"` for auto-generated gates.                                                                                                                                                                                                                                                                                  |
| `firingChannel`   | `string` (enum)                    | yes      | The primary channel that fires this gate: `pre-commit \| commit-msg \| pre-push \| ci-pr \| ci-scheduled \| pnpm-meta \| ralph-gate \| manual`. Validated against `scripts/check-validator-wiring.mjs`'s `VALID_CHANNELS`. Read by `scripts/run-gates.mjs --channel <x>` and other single-channel consumers — keep it set even when `firingChannels` is also present. |
| `firingChannels`  | `string[]`                         | no       | For a gate that genuinely fires from more than one real channel (e.g. wired into both `.husky/pre-commit` AND `ralph/gate.sh`). When present, `firingChannel` must be one of its entries, and `check-validator-wiring.mjs` requires every listed channel to have independent wiring evidence — see #188.                                                              |

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
