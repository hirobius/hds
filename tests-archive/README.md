# tests-archive — retired Playwright browser suite

Archived 2026-07-12 per **#161** (decision: Adrian, 2026-07-11 — retire, don't
rewrite). Same convention as `.github/workflows-archive/`.

These specs (`a11y`, `collision`, `focus-flow`, `keyboard-trap`,
`layout-integrity`, `responsive`, `visual` + `helpers/` +
`playwright.config.ts` + visual baselines) drove the routes of the bespoke
docs SPA that was permanently deleted in **#90** (ADR-018 §4 — Storybook is
the docs surface). There has been nothing left to serve them since; their CI
lanes were already archived in `.github/workflows-archive/`.

They are kept for reference only — nothing collects or runs them:

- `vitest` includes only `*.test.*` under `src/`, `scripts/__tests__/`, `tests/`
- `pnpm lint` covers `src scripts validators tests` (not this directory)
- `tsconfig.typecheck.json` includes `src/**` only
- the `test:layout` / `test:a11y` / `test:visual` / `test:responsive` /
  `test:collision` scripts now fail with a pointer here

If per-story layout/collision/visual auditing is ever needed again, file a
fresh M/L issue to build it against **Storybook stories** (per-story, not
per-route) — do not resurrect these files as-is.
