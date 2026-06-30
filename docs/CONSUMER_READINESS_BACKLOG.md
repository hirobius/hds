# HDS Consumer-Readiness Backlog (living)

> Single source of truth for open consumer-readiness work. Updated as items land.
> Original handoff: the P0/P1/P2 list surfaced while wiring **job-hunt** as the
> first external consumer. Status as of 2026-06-30.
>
> Legend: ✅ done · 🟡 partial · ⬜ not started · 👤 human-gated (needs Adrian) ·
> 🔒 blocked-in-sandbox (needs a Playwright/Chromium-capable machine)

## Release / publishing

| Item | Status | Notes |
|---|---|---|
| **Release 0.7.0** | ⬜ | Merge the **"Version Packages" PR (#19)** — publishes everything below to GitHub Packages. Auto-updates as changesets land on `main`. |
| **P0.2 — npmjs.com publish (tokenless install)** | ⬜ 👤 | GitHub Packages requires a PAT for *every* install. For anonymous `npm install`: create the free npm org `hirobius`, add `NPM_TOKEN` repo secret, then flip `package.json#publishConfig.registry` → `https://registry.npmjs.org`, `.changeset/config.json` access → `public`, and `release.yml` `registry-url` + `NODE_AUTH_TOKEN`. Decide internal-only vs world-public first. |

## P0 — consumption blockers

| Item | Status | Notes |
|---|---|---|
| P0.1 — decouple `react-router` via adapter context | ✅ | `RouterContext` + `HdsRouterProvider`; `react-router` now optional peer. (#17) |
| P0.3 — bundle fonts (option a) | ✅ | woff2 base64-embedded into `dist/tokens.css` via `scripts/embed-fonts.mjs`; app still serves from `/fonts/`. (#17) |
| P0.4 — "Consuming HDS" docs | ✅ | `docs/CONSUMING.md` + README refreshed for 0.7.0. (#17) |
| P0.5 — scope global CSS under `[data-hds]` | 🟡 | Base resets + type baseline + theme transition scoped via `:where([data-hds])` (ADR-016, #17). **Remaining:** Tailwind v4 **preflight** is still global — scoping it needs a visual-regression pass. 🔒 |

## P1 — missing components — ✅ COMPLETE

All shipped (#17 / #20 / #21):
Spinner, Skeleton, Progress, Avatar, Breadcrumb, Pagination, HdsCheckbox,
HdsToggle/HdsRadio/HdsSlider (exported), Popover, Menu, Toast, Combobox,
Form/FormField.

| Optional follow-up | Status | Notes |
|---|---|---|
| RHF + zod opt-in layer on the Form seam | ⬜ | The Form/FormField seam is validation-agnostic by design. Could add an optional `@hookform/resolvers` + `zod` integration recipe/adapter **on top**, without HDS depending on them. |

## P2 — quality / maturity

| Item | Status | Notes |
|---|---|---|
| Harden `smoke:consumer` (jsdom render probe) | ✅ | Mounts components, exercises router seam + CSS/font/scoping. (#17) |
| RTL tests for the **new** P1 components | ✅ | 30 cases across the new components. (#17/#20/#21) |
| RTL tests for **existing** interactive primitives | 🟡 | Select, Toggle, Radio, Dialog, SegmentedControl. **In progress (this branch).** Biggest remaining consumed-library quality risk. |
| Storybook backfill | 🟡 | 12 new components done (#23, ~20→32). **Remaining:** ~33 older components still story-less. |

## #18 — chronic CI failures (repo-wide, predate this work)

| Lane | Status | Notes |
|---|---|---|
| editorconfig version mismatch | ✅ | Pinned `EC_VERSION=v3.7.0` (#22). Was the first blocker in CI + Quality-gate lanes. |
| **Visual regression** | ⬜ 🔒 | No green run since 2026-06-18 across all PRs — baseline/runner drift (Node-24 AA shift). Fix = regenerate `*-snapshots/*.png` via `pnpm test:visual:update` on a Playwright runner, then pin Playwright/Chromium + runner Node. |
| **Web Vitals (Lighthouse)** | ⬜ 🔒 | CLS ~0.11 (budget ≤0.005) + SEO 0.63 (≥0.79) on `/ops`. Identify the layout-shifting element / SEO audit items, or re-baseline budgets. |
| CI + Quality gates fully green post-#22 | ⬜ | Unconfirmed — editorconfig was the *first* failing step; later steps (e.g. Playwright-desktop) may still fail. Re-check after #22 merges. |

## Extras offered (not started)

| Item | Status | Notes |
|---|---|---|
| Duda / managed-builder portable export | ⬜ | `tokens.css` (standalone) + `hds-style-spec.md` (text brief for AI builders) + `hds-tokens.json` (DTCG). The system is portable as tokens + text even though the React components aren't. |

## Open PRs

- **#19** Version Packages (release 0.7.0) — bot
- **#22** editorconfig CI fix
- **#23** Storybook backfill (12 new)
