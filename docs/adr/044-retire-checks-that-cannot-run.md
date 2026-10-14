# ADR-044: Retire Verification That Can No Longer Run

**Status:** Accepted, retroactive (decided 2026-07-11; recorded 2026-10-13 from commit and PR history). The Storybook half of the replacement was itself retired in October; the docs site took over (see Consequences).

## Context

ADR-018 cut the docs SPA down to Storybook. Several checks had been written against
that SPA and kept their place in scripts, CI and agent instructions after the thing
they checked was gone.

- Lighthouse CI. `20e69cd` (hds#43) retired the lane "after it proved unable to
  audit the SPA (redirect-stub CLS, NaN LCP/TBT on content pages)". It was
  ADR-018 section 5 "brought forward".
- The Playwright browser suite. `36e3eb1` (hds#90) deleted the docs SPA. `23e8cfc`
  (hds#170, refs hds#161) records the result: the seven browser specs "drove routes
  of the docs SPA deleted in #90 ... nothing has been able to serve them since".
  Their CI lanes were already in `.github/workflows-archive/`.
- Agent instructions still told every UI-touching agent to run `pnpm test:layout`,
  which could not work. The commit calls it a "phantom test:layout".

## Decision

- Retire the Playwright suite instead of rewriting it. `23e8cfc` says this was
  "Adrian's 2026-07-11 call (retire, don't rewrite)".
- Move the suite, its snapshots and a README to `tests-archive/`. The README says why
  and what a Storybook-based rebuild would look like, "fresh issue, not a
  resurrection".
- Make `test:{a11y,collision,layout,responsive,visual,visual:update}` fail with a
  pointer to hds#161 instead of "a cryptic webServer error".
- Drop the four dead Playwright lanes from `check:release`. In CLAUDE.md,
  AUTO-VALIDATE becomes typecheck plus vitest.
- Put visual coverage on Storybook and Chromatic. `7f829ed` (hds#171) added a
  brand x density x theme modes matrix (two tenants, two densities, two themes) to
  six primitives, because "only data-theme was exercised in visual coverage".
- Add a check that does not need Chromatic. `1fe15b7` (hds#126) adds a vitest AA
  contrast assertion per pilot tenant for accent surfaces.

## Alternatives considered

- Rewrite the Playwright suite against Storybook. Rejected by Adrian's "retire, don't
  rewrite". The README keeps the idea as a fresh issue.
- Lighthouse on the SPA. None recorded at the time; the audit gave unusable numbers.

## Rationale

- A check that nothing can serve gives no signal, and a script that errors on setup
  hides the reason. A script that fails with a pointer says what happened.
- The per-tenant AA test exists because the Chromatic baseline "stays blocked on a
  human workflow_dispatch (bot token has no Actions-write scope)", re-verified as a 403. The commit calls the vitest test "deterministic and CI-live".

## Consequences

- `tests-archive/` was later removed by `cf70ef6a` (hds#321, 2026-09-29), part of
  curating archives and retired scripts. It is not on origin/main.
- Storybook was retired in October (ADR-036). Step 2, `9f1acfcb` (hds#587), moved docs links
  and checks to the docs site. The repo has no `.storybook/`. CLAUDE.md now names the
  docs site as the visual surface: `check-docs-axe` for accessibility and the
  Chromatic docs job for visual regression (`tests/visual/docs-demos.spec.ts`).
- The rule behind this ADR still holds. The surface changed twice and the old checks
  were retired each time.

## Lessons

- When you delete a surface, delete or re-point every check and instruction aimed at
  it in the same change. Instructions that name a dead command train agents to skip
  verification.
- Prefer a loud stub to a silent removal. Dead scripts that print a pointer tell the
  next reader where the history went.
- Do not let one external service be the only proof. The Chromatic baseline needed a
  human dispatch, so a deterministic test covered the same regression.

## Evidence

- `20e69cd` Sterilize 1/7: remove /ops residue + retire Lighthouse lane (PR #43)
- `36e3eb1` ADR-018 sterilization: docs-SPA to Storybook (PR #90)
- `23e8cfc` chore(tests): retire the dead Playwright browser suite to tests-archive/ (PR #170)
- `7f829ed` test(storybook): per-brand/density/theme modes matrix for Chromatic (PR #171)
- `1fe15b7` test(contracts): per-tenant AA-contrast assertion for accent surfaces (hds#126)
- `cf70ef6a` chore(repo): curate archives, retired scripts ... (PR #321)
- `9f1acfcb` Storybook retirement, step 2 (PR #587)
- hds#161: the issue the retired test scripts point to
