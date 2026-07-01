# ADR-018: Repo sterilization — reduce the repo to the design system

- **Status:** Accepted
- **Date:** 2026-07-01
- **Decider:** Adrian (with Claude analysis pass)
- **Related:** [repo map](../architecture/repo-map.mmd), ADR-016 (scoped base styles), ADR-017 (docs nav)

## Context

The repository grew far beyond the published package. At decision time it held
114 components and the token pipeline (the actual DS, ~20% of the repo) plus: a
bespoke 48-page docs site, a gated `/ops` dashboard, a portfolio/marketing app
with 47 MB of assets, 128 guardrail scripts across 11 CI workflows with a
fixture proof-of-firing meta-system, a Figma bridge (plugin + protocol +
workflows), a local-LLM/agent-orchestration layer, and 27 top-level `.md`
files. The sprawl had real costs: most commits/pushes required `--no-verify`,
CI lanes were persistently red for reasons unrelated to the package, and the
consumability work (0.7.0–0.9.0) repeatedly fought infrastructure instead of
shipping component value.

With `@hirobius/design-system` now publicly published and consumed by external
apps, the repo's job is to be a **design system**, not a portfolio-grade
product surface. Each subsystem was reviewed against one question: _is this
necessary for a modern design system?_

## Decision

Cut or trim every subsystem that is not the published package, its build, its
tests, or its component showcase:

| #   | Subsystem                                                                                                                                                                                        | Decision                                                                                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Portfolio/marketing (`apps/concrete`, `/portfolio`, `/atlas`, 47 MB `public/` assets, asset-slot machinery)                                                                                      | **Extract** to a separate `hirobius-portfolio` repo that consumes the DS from npm (dogfooding consumer). Removed from this repo.                                                                                                                                                                                |
| 2   | Figma bridge (`figma-agent-plugin/`, `protocol/` incl. the published `./protocol` subpath, `hds-bridge`, `sync-figma-variables` workflow)                                                        | **Cut**; parked on an `archive/figma-bridge` branch. Recoverable if Figma round-tripping resumes.                                                                                                                                                                                                               |
| 3   | Local-AI + agent-orchestration layer (`Modelfile`, `ask-hds.sh`, `llm-stream-bridge`, `hds-sync.js`, `llms.txt` generation, `pipeline/`, `codemods/`, `claude-config/`, `AGENTS.md`, `docs/ai/`) | **Cut.** A single trimmed `CLAUDE.md` remains as the agent contract.                                                                                                                                                                                                                                            |
| 4   | Bespoke docs site (48 pages, nav model, prerender, per-page budgets)                                                                                                                             | **Cut — Storybook-only.** The 64 stories become the sole component showcase, deployed statically.                                                                                                                                                                                                               |
| 5   | Guardrail system (128 scripts, fixture proof-of-firing, 11 workflows)                                                                                                                            | **Trim to a lean gate set (~8):** typecheck, eslint, prettier, token pipeline validity (`verify-tokens` + `check-contrast`), unit/type tests, Storybook build, `smoke:consumer` (+ `attw`/`publint`), `size-limit`. The rest archived, not deleted — the Swiss-canon rules remain recoverable as documentation. |
| 6   | `/ops` dashboard (pages, `VITE_OPS_GATE_HASH` gating, legacy redirects, `/ops` Lighthouse budget, Web-Vitals #18)                                                                                | **Cut entirely.**                                                                                                                                                                                                                                                                                               |
| 7   | Top-level `.md` sprawl (27 files)                                                                                                                                                                | **Consolidate to ~5:** `README`, `CONSUMING`, `CONTRIBUTING`, `CHANGELOG`, one `ARCHITECTURE`. Others archived.                                                                                                                                                                                                 |

## Consequences

- **The published package is the invariant.** Every sterilization PR is pure
  deletion/extraction gated by `smoke:consumer` (+ `attw`/`publint`), proving
  the consumer-facing surface never changes. Exception: the `./protocol`
  subpath is removed with the Figma bridge — a **breaking** export-map change
  released as such.
- **Execution is sequenced, one PR per cut**, in dependency order:
  `/ops` → portfolio extraction → Figma bridge → AI layer → docs site →
  guardrail lean-down → `.md` consolidation. Each is individually revertible.
- Sterilization starts only after the 0.9.0 consumability release is merged
  and published, so it never blocks consumers.
- The `--no-verify` era ends with the guardrail lean-down: the lean gates are
  runnable in any environment (no live-site fetches, no browser-dependent
  pre-push steps).
- Costs accepted: the designed-publication docs site is lost in favor of
  Storybook; Figma sync and the local-AI tooling require un-archiving to
  resume; portfolio deploys move to their own repo/Vercel project.
