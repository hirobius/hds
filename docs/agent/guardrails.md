# Guardrails

The repo has a closed-loop guardrail system. Read this once at session start.

## The gate registry

- `docs/guardrails/registry.json` registers each `scripts/check-*.mjs` and `scripts/audit-*.mjs`.
- Each entry has a `firingChannel`: pre-commit, pre-push, ci-pr, ci-scheduled, pnpm-meta or manual.
- `docs/guardrails/SCHEMA.md` is the field reference. It says what each `firingChannel` means.
- `validate-guardrail-registry` and `check-validator-wiring` catch drift. Run them on demand. No hook runs them.

## The state-surface registry

- `docs/state-surfaces.json` lists each file that describes project state.
- A `generated` file names the `check` that proves it fresh, or says `"freshness": "unchecked"`.
- A `checked` file has a gate that compares it with the code.
- An `editorial` file has an owner, `reviewedAt` and `maxAgeDays`.
- `scripts/check-state-surfaces.mjs` fails on a missing file.
- It fails on a doc that names a path that does not exist.
- It fails on a generated file with no check that can be verified.
- An editorial file past its review age gives a "review due" warning. `--strict-review` makes it a failure.
- Edit the source of a generated file, never the file.
- After you re-read an editorial file, set its `reviewedAt` to today or earlier.
- The index of all registered documents is `docs/ai/DOCS-INDEX.md`.

## Record freshness (a pre-push gate)

`status.json` and `CHANGELOG.md` staleness is a gate, not a memory aid.
`scripts/check-record-freshness.mjs` fails the push in two cases.

- Case 1: a commit touches `src/`, `scripts/` or `docs/adr/` and is newer than `updatedAt` in `status.json`.
  - Fix: name the issue in a pushed commit message, for example `Refs ops#1057`. Post the receipt on that issue. Do not edit `status.json` for this.
  - A legacy `.status/<branch>.md` note still counts. `pnpm status:fold` folds the notes on `main`.
- Case 2: a commit changes what ships and has no pending `.changeset/*.md`.
  - Fix: add a changeset, or put the marker `skip-changeset` in the commit message.
- Each changeset has a matching `upgrade/pending/<same name>.json`. Make it with `pnpm upgrade:note`.
- Below 1.0, a breaking change needs a minor bump.
- The gate's entry in `docs/guardrails/registry.json` has the exact file lists.

## Budgets on the front-door files

- `scripts/check-steering-budget.mjs` caps the total size of the always-on files. The list is `docs/guardrails/steering-budget.json`.
- `scripts/check-repo-docs.mjs` caps the line count of `README.md`, `CONTRIBUTING.md`, `CLAUDE.md` and `AGENTS.md`. Its config is `.repo-docs.json`.
- Fix a failure by moving detail to a topic file. Do not raise a cap.
