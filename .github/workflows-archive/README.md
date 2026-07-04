# Archived CI workflows (#52 / ADR-018 §5)

These workflows are **archived, not deleted**. GitHub Actions only scans
`.github/workflows/`, so files here are inert but fully recoverable.

The guardrail lean-down (ADR-018 §5) trimmed the quality system to the lean gate
set — now the single active workflow `.github/workflows/ci.yml` (plus
`release.yml`). The lanes below were the "rest": browser-dependent, live-site
fetching, external-service, or superseded by the lean set / other sterilization
cuts.

| Workflow                   | Why archived                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y.yml`                 | Playwright accessibility run — browser-dependent; not in the lean set.                                                                    |
| `visual.yml`               | Playwright visual regression — chronically red across all PRs (#18), browser-dependent.                                                   |
| `responsive.yml`           | Playwright responsive checks — browser-dependent.                                                                                         |
| `collision.yml`            | PR collision check — folded out of the lean set.                                                                                          |
| `chromatic.yml`            | Chromatic visual review — external paid service; the lean `ci.yml` builds Storybook to verify it compiles.                                |
| `quality.yml`              | Ran `run-gates --channel ci-pr`, type-coverage, and Playwright `test:layout`; its bundle-budget step (`size-limit`) folded into `ci.yml`. |
| `sync-figma-variables.yml` | Figma token push — part of the Figma bridge cut (ADR-018 §2, `archive/figma-bridge`).                                                     |
| `llm-daily-synthetic.yml`  | Scheduled LLM synthetic regression — part of the local-AI layer cut (ADR-018 §3).                                                         |

## Restoring one

Move it back into the active directory:

```sh
git mv .github/workflows-archive/<name>.yml .github/workflows/<name>.yml
```

The underlying scripts (`scripts/check-*.mjs`, `scripts/audit-*.mjs`) were never
removed — they remain runnable on demand (e.g. `node scripts/run-gates.mjs
--channel ci-pr`), so a restored workflow works immediately.
