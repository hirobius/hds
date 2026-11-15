# Contributing: detail

The short form is `CONTRIBUTING.md`. This file has the gate list and the less common tasks.

## Key documents

| File                       | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `CLAUDE.md`                | Agent operating instructions (read first)                        |
| `public/llms.txt`          | AI entry point — generated, do not edit directly                 |
| `DESIGN.md`                | Lean visual spec — generated from `DESIGN.source.md`             |
| `public/hds-manifest.json` | Machine-readable component inventory — generated                 |
| `docs/state-surfaces.json` | Every file that describes state: generated, checked or editorial |

Generated outputs that must never be hand-edited are marked `generated` in
`docs/state-surfaces.json`. Edit the generator or its source.

## Merging main into a branch

Generated files never stop a merge: the manifest, the sync map, the README counts, the stats,
`DESIGN.md`, `DESIGN-HANDOFF.md`, `llms-full.txt` and the types baseline.

- `.gitattributes` gives them the `hds-generated` merge driver. `pnpm install` registers it.
- Where both sides changed the same lines, the driver keeps your side.
- `.husky/post-merge` then runs `pnpm regen` to rebuild them from source. Commit what it rebuilt.
- After a merge made without the hooks, run `pnpm regen` yourself.

## Gates

Three hooks run gates: `.husky/pre-commit`, `.husky/commit-msg` and `.husky/pre-push`.
The stages of the pre-push hook are the `pre-push` lane of `docs/guardrails/registry.json`.

- Do not wait on GitHub Actions for a pull request. The `ci` rows below are the list to run by hand before a push.
- A merge needs an independent `Reviewed: PASS — <sha>` PR comment.
- The table mirrors the hooks and `.github/workflows/ci.yml` step for step.
- `scripts/__tests__/contributing-gates.test.mjs` fails when the table drifts. Edit the hook or workflow and this table together.
- CI steps that only check out, set up tooling or restore the cache are not gates, so the table omits them.
- Never use `--no-verify`. When a gate fails, fix the cause.

| Stage      | Step                                                                                                          | Command                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| pre-commit | Secrets scan (gitleaks; skips gracefully if absent)                                                           | `pnpm check:secrets`                                                         |
| pre-commit | Prettier (staged files)                                                                                       | `node scripts/run-lint-staged.mjs`                                           |
| pre-commit | Typecheck                                                                                                     | `pnpm typecheck`                                                             |
| pre-commit | ESLint (zero warnings)                                                                                        | `pnpm lint --max-warnings=0`                                                 |
| pre-commit | Token pipeline validity (verify-tokens + check-contrast)                                                      | `node scripts/verify-tokens.mjs && node scripts/check-contrast.mjs`          |
| pre-commit | Record join (source ↔ manifest ↔ docs page ↔ Figma)                                                           | `node scripts/check-sync-map.mjs && node scripts/check-sync-map.mjs --check` |
| pre-commit | Contract coverage (every core component says when to use it)                                                  | `node scripts/check-contract-coverage.mjs --enforce`                         |
| pre-commit | A11y contracts (interactive components state and test their a11y rules)                                       | `node scripts/check-a11y-contracts.mjs --enforce`                            |
| pre-commit | Pure annotations (top-level factory calls, compound Object.assign and X.Part writes)                          | `node scripts/check-pure-annotations.mjs`                                    |
| pre-commit | Spacing vocabulary (no raw integers on sx spacing props)                                                      | `node scripts/check-spacing-vocabulary.mjs`                                  |
| pre-commit | Walkthrough evidence (media recorded with every gate green)                                                   | `node scripts/check-walkthrough-evidence.mjs`                                |
| pre-commit | Layout-gap vocabulary (one name map, in box-sx.ts)                                                            | `node scripts/check-layout-gap-vocabulary.mjs`                               |
| pre-commit | Type ramp (src/ uses the seven roles only)                                                                    | `node scripts/check-type-ramp.mjs`                                           |
| pre-commit | No ALL CAPS (nothing transforms text to uppercase)                                                            | `node scripts/check-no-uppercase.mjs`                                        |
| pre-commit | No ordinal labels                                                                                             | `node scripts/check-no-ordinal-labels.mjs`                                   |
| pre-commit | No hand-set letter-spacing                                                                                    | `node scripts/check-no-custom-tracking.mjs`                                  |
| pre-commit | Ralph kit drift (vendored kit files match ralph/kit.lock.json)                                                | `node scripts/check-ralph-kit-drift.mjs --staged`                            |
| pre-commit | Lessons copy (vendored .claude/lessons matches its lock)                                                      | `node .claude/lessons/check-drift.mjs`                                       |
| commit-msg | Learned trailer (fix:/revert: commits carry a Learned: line)                                                  | `node scripts/check-learned-trailer.mjs "$1"`                                |
| pre-push   | Secret + PII scan (pushed commits; fails closed without gitleaks)                                             | `node scripts/hooks/secret-pii-scan.mjs`                                     |
| pre-push   | Record freshness (status.json + changeset presence)                                                           | `node scripts/check-record-freshness.mjs`                                    |
| pre-push   | TDD gate (source changes ship with a test)                                                                    | `node scripts/check-tests-with-code.mjs`                                     |
| pre-push   | Tiered gate (docs: none · fast: lint + typecheck + related tests · full: check:fast + affected tests + smoke) | `node scripts/pre-push-gate.mjs`                                             |
| ci         | Secrets scan (gitleaks, full history)                                                                         | `bash scripts/ci-secrets-scan.sh`                                            |
| ci         | ESLint (zero warnings)                                                                                        | `pnpm lint --max-warnings=0`                                                 |
| ci         | Bundle budgets (size-limit)                                                                                   | `node scripts/build-button-probe.mjs && pnpm size-limit`                     |
| ci         | Consumer smoke                                                                                                | `pnpm smoke:consumer`                                                        |
| ci         | Docs axe gate (live demos, light + dark, serious/critical)                                                    | `node scripts/check-docs-axe.mjs`                                            |
| ci         | Docs axe gate fires (fixtures)                                                                                | `>-`                                                                         |
| ci         | All required jobs passed                                                                                      | `\|`                                                                         |

### Pre-push tiers

`scripts/lib/gate-tier.mjs` picks the tier from the diff.

- Docs only (`*.md`, `*.mdx`, `docs/**`, images): no tests.
- A small diff: eslint on the changed files, `pnpm typecheck` and `vitest related`.
- The full chain: `pnpm check:fast`, `pnpm test` and `pnpm smoke:consumer`.

The full chain runs when the branch touches one of these:

- `package.json`, the lockfile, or build, test, TypeScript or eslint config.
- Tokens, or `src/styles|tokens|theme/`.
- `scripts/` (tests excepted) or `.husky/`.
- Published code and token sources: `bin/`, `codemods/`, `upgrade/`, `accents/`, `directions/`.
- Shipped Markdown with drift checks: `DESIGN.md`, `DESIGN.source.md`, `CONSUMING.md`, `UPGRADING.md`, `MIGRATIONS.md`.
- knip or size-limit config, `.npmrc`, `.nvmrc`, `docs-site/package.json`.
- More than 25 files, or a diff that is unknown.

To force the full chain: `HDS_FULL_GATE=1 git push`.

## Visual baselines (local, before a visual PR)

- `pnpm docs:publish && pnpm test:visual-baselines` compares each docs demo, light and dark, with the PNGs in `tests/visual/*-snapshots/`.
- After an intended visual change, run `pnpm test:visual-baselines:update`, look at the changed PNGs and commit them with the change.
- Baselines are Linux Chromium (the remote container).
- The same run covers six primitives under each demo tenant, density and theme. The axes, and how to add one, are in `tests/visual/tenant-matrix.ts`.

## Commit examples

```
docs(contributing): drop the retired unit workflow (#612)
feat(hds): add Button loading state (#123)
fix(tokens): remove stale elevation.sticky references (#456)
```

- A `fix:` or `revert:` commit carries a `Learned:` trailer line. The commit-msg hook checks it.
- A commit that an agent writes ends with one plain `Co-Authored-By` trailer.

## Agent workflows

Sub-agent dispatch rules (model selection, worktree isolation, no bulk `lint:fix`) are in `CLAUDE.md`
and `docs/agent/`. `CLAUDE.md` is the source of truth.
