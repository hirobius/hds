# Contributing to Hirobius Design System (HDS)

## Dev Setup

### Prerequisites

- **Node.js** `v25` (see `.nvmrc` if present, or match CI)
- **pnpm** `10.x` (`npm install -g pnpm@10`)

### Install and run

```bash
pnpm install
pnpm dev          # Vite dev server
```

### Key documents

| File                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `CLAUDE.md`                   | Agent operating instructions (read first)                |
| `public/llms.txt`             | AI entry point — generated, do not edit directly         |
| `DESIGN.md`                   | Lean visual spec — generated from `DESIGN.source.md`     |
| `public/hds-manifest.json`    | Machine-readable component inventory — generated         |
| `docs/ai/AGENT_GUIDELINES.md` | Sub-agent dispatch doctrine, token rules, commit hygiene |
| `docs/ai/orchestration.json`  | Unit queue — 339+ build units, source of truth for work  |

---

## Gates

Three places run gates: `.husky/pre-commit`, `.husky/pre-push` and
`.github/workflows/ci.yml`. The table below mirrors them step for step;
`scripts/__tests__/contributing-gates.test.mjs` fails when it drifts, so edit the
hook or workflow and this table together. CI steps that only check out, set up
tooling, or restore the cache are omitted because they are not gates.

| Stage      | Step                                                                           | Command                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pre-commit | Secrets scan (gitleaks; skips gracefully if absent)                            | `pnpm check:secrets`                                                                                                                                                                       |
| pre-commit | Prettier (staged files)                                                        | `pnpm exec lint-staged`                                                                                                                                                                    |
| pre-commit | Typecheck                                                                      | `pnpm typecheck`                                                                                                                                                                           |
| pre-commit | ESLint (zero warnings)                                                         | `pnpm lint --max-warnings=0`                                                                                                                                                               |
| pre-commit | Token pipeline validity (verify-tokens + check-contrast)                       | `node scripts/verify-tokens.mjs && node scripts/check-contrast.mjs`                                                                                                                        |
| pre-commit | Record join (source ↔ manifest ↔ Storybook ↔ Figma)                            | `node scripts/check-sync-map.mjs && node scripts/check-sync-map.mjs --check`                                                                                                               |
| pre-commit | Story coverage (every consumer-facing component is visible)                    | `node scripts/check-story-coverage.mjs`                                                                                                                                                    |
| pre-commit | Contract coverage (every core component says when to use it)                   | `node scripts/check-contract-coverage.mjs --enforce`                                                                                                                                       |
| pre-push   | Unit + contract tests (pnpm test: pretest gates + vitest)                      | `pnpm test`                                                                                                                                                                                |
| pre-push   | Consumer smoke (build:lib + subpath resolution + publint + consumer typecheck) | `pnpm smoke:consumer`                                                                                                                                                                      |
| pre-push   | Record freshness (status.json + changeset presence)                            | `node scripts/check-record-freshness.mjs`                                                                                                                                                  |
| ci         | Install dependencies                                                           | `pnpm install --frozen-lockfile`                                                                                                                                                           |
| ci         | Generate data artifacts                                                        | `node scripts/generate-manifest.mjs && node scripts/generate-component-api.mjs && node scripts/enrich-manifest.mjs && node scripts/sync-icons.mjs && node scripts/audit-tokens.mjs --full` |
| ci         | Typecheck                                                                      | `pnpm typecheck`                                                                                                                                                                           |
| ci         | ESLint (zero warnings)                                                         | `pnpm lint --max-warnings=0`                                                                                                                                                               |
| ci         | Token pipeline validity (verify-tokens + check-contrast)                       | `node scripts/verify-tokens.mjs && node scripts/check-contrast.mjs`                                                                                                                        |
| ci         | Figma drift (committed snapshot)                                               | `node scripts/check-figma-drift.mjs --ci`                                                                                                                                                  |
| ci         | Gate chain + unit/contract tests (pretest + vitest)                            | `pnpm test`                                                                                                                                                                                |
| ci         | Bundle budgets (size-limit)                                                    | `pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit`                                                                                                                 |
| ci         | Consumer smoke (build:lib + subpath resolution + publint + consumer typecheck) | `pnpm smoke:consumer`                                                                                                                                                                      |
| ci         | Storybook build                                                                | `pnpm build-storybook`                                                                                                                                                                     |
| ci         | Install Chromium                                                               | `pnpm exec playwright install --with-deps chromium`                                                                                                                                        |
| ci         | Storybook axe gate (light + dark, serious/critical)                            | `node scripts/check-storybook-axe.mjs`                                                                                                                                                     |

Never use `--no-verify`. When a gate fails, fix the cause.

---

## Unit-Driven Workflow

All work in this repo flows through **build units** defined in
`docs/ai/orchestration.json`.

### Finding eligible work

A unit is ready to execute when all three conditions hold:

```
"status": "proposed"    (or "approved")
"approval": "approved"
"dependsOn": [...]      all IDs in the list are "status": "done"
```

Search the file for `"approval": "approved"` and filter by `dependsOn`
satisfaction.

### Unit ID convention

```
{phase}{cluster}-{slug}

Examples:
  12n-api-changelog-automation
  12p-test-contract-tests-primitives
  12i-quality-eslint-burndown
```

- `{phase}` is the numeric phase prefix (`12-hds-refinement` → `12`).
- `{cluster}` is the cluster short-code (`n-api`, `p-test`, `i-quality`, …).
- `{slug}` is a kebab-case description of the deliverable.

### Marking a unit done

**In the same commit** as the deliverable:

1. Set `"status": "done"` on the unit.
2. Append an entry to `"agentNotes"`:

```json
"agentNotes": [
  "DONE 2026-05-01 (Window 1, Agent 1C): one-line description of what was done."
]
```

Never mark a unit `done` in a separate commit, and never mark it `done`
before the deliverable lands.

---

## Commit Format

```
<scope>(<area>): <unit-id> <one-line summary>

<body explaining the why>

Co-Authored-By: <agent name> <noreply@example.com>
```

**Examples:**

```
docs(ops): 12n-api-contributing-and-coc CONTRIBUTING.md + CODE_OF_CONDUCT.md
feat(hds): 12g-primitives-hds-button HdsButton v2 — compound variant system
fix(tokens): 12i-quality-binding-drift remove stale elevation.sticky references
```

Commits written by an agent end with one plain `Co-Authored-By` trailer, as above.

**Hard rules (cross-ref `docs/ai/AGENT_GUIDELINES.md` §10):**

- **Never push to remote** without an explicit instruction from Adrian.
- **Never use `--no-verify`** to skip pre-commit gates.
- **Never `--amend` to hide breakage.** If a commit broke something, make a
  fix-up commit and document what went wrong in `agentNotes`.
- **Never `git reset --hard main`** without explicit instruction.

---

## PR Template

`.github/PULL_REQUEST_TEMPLATE.md` auto-populates when you open a PR on
GitHub. **Pasted validator output is mandatory** — run the pre-commit gates locally,
copy the terminal output, and paste it into the "Validator output" section
before requesting review.

---

## AI-Augmented Workflows

This repo uses autonomous sub-agent dispatch for bulk unit execution.
`docs/ai/AGENT_GUIDELINES.md` is the source of truth for:

- **Model selection** (haiku for mechanical edits, sonnet for most code and
  all deletions, opus for architectural reasoning) — §1.
- **Worktree isolation** and the required `git reset --hard fix/ui-pipeline`
  first action — §2.
- **No bulk `lint:fix`** — scope to one rule at a time with verification — §3.
- **Validate before claiming** — every `agentNotes` claim must include a
  grounding ref — §4.
- **Token discipline** and bypass markers — §8.
- **Auto-gen outputs** that must never be hand-edited — §9.

---

## Contact

- **Email:** adrian@hirobius.com
- **Issues:** open a GitHub issue on this repository for bugs, feature
  requests, or questions about the design system.
