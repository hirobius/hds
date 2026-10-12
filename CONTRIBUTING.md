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

| File                       | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `CLAUDE.md`                | Agent operating instructions (read first)                        |
| `public/llms.txt`          | AI entry point — generated, do not edit directly                 |
| `DESIGN.md`                | Lean visual spec — generated from `DESIGN.source.md`             |
| `public/hds-manifest.json` | Machine-readable component inventory — generated                 |
| `docs/state-surfaces.json` | Every file that describes state: generated, checked or editorial |

---

## Gates

Three places run gates: `.husky/pre-commit`, `.husky/pre-push` and
`.github/workflows/ci.yml`. The table below mirrors them step for step;
`scripts/__tests__/contributing-gates.test.mjs` fails when it drifts, so edit the
hook or workflow and this table together. CI steps that only check out, set up
tooling, or restore the cache are omitted because they are not gates.

| Stage      | Step                                                                                 | Command                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pre-commit | Secrets scan (gitleaks; skips gracefully if absent)                                  | `pnpm check:secrets`                                                                                                                                                                       |
| pre-commit | Prettier (staged files)                                                              | `node scripts/run-lint-staged.mjs`                                                                                                                                                         |
| pre-commit | Typecheck                                                                            | `pnpm typecheck`                                                                                                                                                                           |
| pre-commit | ESLint (zero warnings)                                                               | `pnpm lint --max-warnings=0`                                                                                                                                                               |
| pre-commit | Token pipeline validity (verify-tokens + check-contrast)                             | `node scripts/verify-tokens.mjs && node scripts/check-contrast.mjs`                                                                                                                        |
| pre-commit | Record join (source ↔ manifest ↔ docs page ↔ Figma)                                  | `node scripts/check-sync-map.mjs && node scripts/check-sync-map.mjs --check`                                                                                                               |
| pre-commit | Contract coverage (every core component says when to use it)                         | `node scripts/check-contract-coverage.mjs --enforce`                                                                                                                                       |
| pre-commit | Pure annotations (top-level factory calls, compound Object.assign and X.Part writes) | `node scripts/check-pure-annotations.mjs`                                                                                                                                                  |
| pre-commit | Spacing vocabulary (no raw integers on sx spacing props)                             | `node scripts/check-spacing-vocabulary.mjs`                                                                                                                                                |
| pre-commit | Layout-gap vocabulary (one name map, in box-sx.ts)                                   | `node scripts/check-layout-gap-vocabulary.mjs`                                                                                                                                             |
| pre-commit | Type ramp (src/ uses the seven roles only)                                             | `node scripts/check-type-ramp.mjs`                                                                                                                                                         |
| pre-commit | Ralph kit drift (vendored kit files match ralph/kit.lock.json)                       | `node scripts/check-ralph-kit-drift.mjs --staged`                                                                                                                                          |
| pre-push   | Record freshness (status.json + changeset presence)                                  | `node scripts/check-record-freshness.mjs`                                                                                                                                                  |
| pre-push   | TDD gate (source changes ship with a test)                                           | `node scripts/check-tests-with-code.mjs`                                                                                                                                                   |
| pre-push   | Unit + contract tests (pnpm test: pretest gates + vitest)                            | `pnpm test`                                                                                                                                                                                |
| pre-push   | Consumer smoke (build:lib + subpath resolution + publint + consumer typecheck)       | `pnpm smoke:consumer`                                                                                                                                                                      |
| ci         | Install dependencies                                                                 | `pnpm install --frozen-lockfile`                                                                                                                                                           |
| ci         | Secrets scan (gitleaks, full history)                                                | `bash scripts/ci-secrets-scan.sh`                                                                                                                                                          |
| ci         | Generate data artifacts                                                              | `node scripts/generate-manifest.mjs && node scripts/generate-component-api.mjs && node scripts/enrich-manifest.mjs && node scripts/sync-icons.mjs && node scripts/audit-tokens.mjs --full` |
| ci         | Typecheck                                                                            | `pnpm typecheck`                                                                                                                                                                           |
| ci         | ESLint (zero warnings)                                                               | `pnpm lint --max-warnings=0`                                                                                                                                                               |
| ci         | Token pipeline validity (verify-tokens + check-contrast)                             | `node scripts/verify-tokens.mjs && node scripts/check-contrast.mjs`                                                                                                                        |
| ci         | Figma drift (committed snapshot)                                                     | `node scripts/check-figma-drift.mjs --ci`                                                                                                                                                  |
| ci         | Gate chain + unit/contract tests (pretest + vitest)                                  | `pnpm test`                                                                                                                                                                                |
| ci         | Bundle budgets (size-limit)                                                          | `pnpm build:lib && node scripts/build-button-probe.mjs && pnpm size-limit`                                                                                                                 |
| ci         | Consumer smoke (build:lib + subpath resolution + publint + consumer typecheck)       | `pnpm smoke:consumer`                                                                                                                                                                      |
| ci         | Install Chromium                                                                     | `pnpm exec playwright install --with-deps chromium`                                                                                                                                        |
| ci         | Docs site build (static export for the docs axe gate)                                | `pnpm docs:publish`                                                                                                                                                                        |
| ci         | Docs axe gate (live demos, light + dark, serious/critical)                           | `node scripts/check-docs-axe.mjs`                                                                                                                                                          |
| ci         | Docs axe gate fires (fixtures)                                                       | `node scripts/check-docs-axe.mjs --dir fixtures/check-docs-axe/passing.example.d && (node scripts/check-docs-axe.mjs --dir fixtures/check-docs-axe/violating.example.d \|\| [ $? -eq 1 ])` |

Never use `--no-verify`. When a gate fails, fix the cause.

---

## Finding and recording work

Work is tracked as **GitHub Issues in this repo**, never in a local file. Pick an
open issue whose `Blocked by` section lists only closed issues, and see
`docs/agents/triage-labels.md` for the label vocabulary. Project state (what is
next, what is blocked, what shipped) is read from issues, `package.json` and
`CHANGELOG.md`; the one hand-written line is `focus` in `status.json`.

---

## Commit Format

```
<type>(<scope>): <one-line summary> (#<issue>)

<body explaining the why>

Co-Authored-By: <agent name> <noreply@example.com>
```

**Examples:**

```
docs(contributing): drop the retired unit workflow (#612)
feat(hds): add Button loading state (#123)
fix(tokens): remove stale elevation.sticky references (#456)
```

Commits written by an agent end with one plain `Co-Authored-By` trailer, as above.

**Hard rules (the full list is in `CLAUDE.md` section 0):**

- **Never push to `main`.** Remote Claude Code sessions push to their `claude/*` branch only.
- **Never use `--no-verify`** to skip pre-commit gates.
- **Never `--amend` to hide breakage.** If a commit broke something, make a
  fix-up commit and say what went wrong in its message.
- **Never `git reset --hard main`** without explicit instruction.

---

## PR Template

`.github/PULL_REQUEST_TEMPLATE.md` auto-populates when you open a PR on
GitHub. **Pasted validator output is mandatory** — run the pre-commit gates locally,
copy the terminal output, and paste it into the "Validator output" section
before requesting review.

---

## AI-Augmented Workflows

Sub-agent dispatch rules (model selection, worktree isolation, no bulk
`lint:fix`) live in `CLAUDE.md`, which is the source of truth. Generated
outputs that must never be hand-edited are marked `generated` in
`docs/state-surfaces.json`; edit the generator or its source instead.

---

## Contact

- **Email:** adrian@hirobius.com
- **Issues:** open a GitHub issue on this repository for bugs, feature
  requests, or questions about the design system.
