# HDS Consumer-Readiness Backlog (living)

> Single source of truth for open consumer-readiness work. Updated as items land.
> Original handoff: the P0/P1/P2 list surfaced while wiring **job-hunt** as the
> first external consumer. Status as of 2026-06-30.
>
> Legend: ✅ done · 🟡 partial · ⬜ not started · 👤 human-gated (needs Adrian) ·
> 🔒 blocked-in-sandbox (needs a Playwright/Chromium-capable machine)

## TL;DR — everything autonomously completable is done

All P0/P1/P2 build work, the RHF+Zod form adapter, the full Storybook backfill,
and the entire docs-nav refactor (ADR-017) are merged to `main`. The **only**
open items are either **human-gated** (cutting the release / choosing a registry)
or **browser-gated** (need a Playwright/Chromium machine this sandbox lacks).
They are listed at the bottom with exact next steps.

## Release / publishing

| Item                                             | Status | Notes                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Release 0.7.0+**                               | ⬜ 👤  | Merge the **"Version Packages" PR (#19)** to publish to GitHub Packages. Held deliberately — publishing is irreversible + human-gated. Note: #19 needs a rebase to pick up the changesets that landed after it (form adapter, etc.); the changeset bot refreshes it.                                                                                                            |
| **P0.2 — npmjs.com publish (tokenless install)** | ⬜ 👤  | GitHub Packages requires a PAT for _every_ install. For anonymous `npm install`: create the free npm org `hirobius`, add `NPM_TOKEN` repo secret, then flip `package.json#publishConfig.registry` → `https://registry.npmjs.org`, `.changeset/config.json` access → `public`, and `release.yml` `registry-url` + `NODE_AUTH_TOKEN`. Decide internal-only vs world-public first. |

## P0 — consumption blockers

| Item                                               | Status | Notes                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0.1 — decouple `react-router` via adapter context | ✅     | `RouterContext` + `HdsRouterProvider`; `react-router` now optional peer. (#17)                                                                                                                                                                                                |
| P0.3 — bundle fonts (option a)                     | ✅     | woff2 base64-embedded into `dist/tokens.css` via `scripts/embed-fonts.mjs`; app still serves from `/fonts/`. (#17)                                                                                                                                                            |
| P0.4 — "Consuming HDS" docs                        | ✅     | `docs/CONSUMING.md` + README refreshed for 0.7.0; §8.5 documents the `/form` adapter. (#17, #26)                                                                                                                                                                              |
| P0.5 — scope global CSS under `[data-hds]`         | 🟡 🔒  | Base resets + type baseline + theme transition scoped via `:where([data-hds])` (ADR-016, #17). **Remaining:** Tailwind v4 **preflight** is still global — scoping it safely needs a visual-regression pass on a browser machine, so it's left rather than shipped unverified. |

## P1 — missing components — ✅ COMPLETE

All shipped (#17 / #20 / #21):
Spinner, Skeleton, Progress, Avatar, Breadcrumb, Pagination, HdsCheckbox,
HdsToggle/HdsRadio/HdsSlider (exported), Popover, Menu, Toast, Combobox,
Form/FormField.

| Optional follow-up                      | Status | Notes                                                                                                                                                                                                             |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RHF + Zod opt-in layer on the Form seam | ✅     | Shipped as the optional `@hirobius/design-system/form` subpath: `useHdsForm` + `HdsForm` + render-prop `HdsFormField`, reusing `FormFieldShell`/`useFieldWiring`. RHF/zod/resolvers are optional peer deps. (#26) |

## P2 — quality / maturity

| Item                                              | Status | Notes                                                                                                          |
| ------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Harden `smoke:consumer` (jsdom render probe)      | ✅     | Mounts components, exercises router seam + CSS/font/scoping. (#17)                                             |
| RTL tests for the **new** P1 components           | ✅     | 30 cases across the new components. (#17/#20/#21)                                                              |
| RTL tests for **existing** interactive primitives | ✅     | Toggle, Radio, SegmentedControl, Dialog, Select — 16 cases. (#24)                                              |
| Storybook backfill                                | ✅     | All 43 exported components that lacked stories now covered (20 → 63 documented). (#25; #23 closed as a subset) |

## Docs-nav refactor — ADR-017 — ✅ COMPLETE (one browser-gated tail)

Single-source, derived navigation: page `meta` → generated `nav-model.json` →
sidebar + Cmd-K search.

| Phase                              | Status | Notes                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — model + generator + drift test | ✅     | `scripts/generate-nav-model.mjs` → `nav-model.json`; drift test. (#28)                                                                                                                                                                                                                            |
| 2 — colocate page `meta` as source | ✅     | 16 pages export `meta`; one-file edits to add a nav page. (#29)                                                                                                                                                                                                                                   |
| 3 — sidebar reads the model        | ✅     | `HDS_NAV_SECTIONS` derived from the model; `buildNavSections`/`INTERNAL_NAV_ITEMS` deleted. (#30)                                                                                                                                                                                                 |
| 3b — Cmd-K search reads the model  | ✅     | `FOUNDATION_SECTIONS` deleted; search corpus derived from the model (+ `description` on `meta`). No more search/sidebar drift. (#31)                                                                                                                                                              |
| 4 — single active-state rule       | 🟡     | `isNavItemActive` centralizes the predicate (was copy-pasted ×3). (#32) **Remaining 🔒:** the full `NestedNavGroup`→ public `NavGroup` renderer swap — changes live sidebar UX (localStorage persistence + mobile drawer) and needs a browser to verify; pair with extending `NavGroup` to match. |
| 5 — SSR/Astro guards               | ✅     | `window` reads in render guarded; `pnpm build:ssr` clean. (#33)                                                                                                                                                                                                                                   |

## #18 — chronic CI failures (repo-wide, predate this work)

| Lane                                    | Status | Notes                                                                                                                                                                                                            |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| editorconfig version mismatch           | ✅     | Pinned `EC_VERSION=v3.7.0` (#22). Was the first blocker in CI + Quality-gate lanes.                                                                                                                              |
| **Visual regression**                   | ⬜ 🔒  | No green run since 2026-06-18 — baseline/runner drift (Node-24 AA shift). Fix = regenerate `*-snapshots/*.png` via `pnpm test:visual:update` on a Playwright runner, then pin Playwright/Chromium + runner Node. |
| **Web Vitals (Lighthouse)**             | ⬜ 🔒  | CLS ~0.11 (budget ≤0.005) + SEO 0.63 (≥0.79) on `/ops`. Identify the layout-shifting element / SEO audit items, or re-baseline budgets.                                                                          |
| CI + Quality gates fully green post-#22 | ⬜ 🔒  | Re-check on a runner; later steps (Playwright-desktop) may still need the visual/Web-Vitals fixes above.                                                                                                         |

## Extras

| Item                                   | Status | Notes                                                                                                                          |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Duda / managed-builder portable export | ⬜     | Dropped per Adrian (priority is Astro-friendliness, not Duda). The nav model + tokens are already plain-data/Astro-consumable. |

## What's left, in one place

Nothing further is completable in this sandbox. Remaining work is gated on:

- **A human decision** — cut the release (#19) and choose npm-vs-GitHub-Packages (P0.2).
- **A browser/Playwright machine** — Tailwind-preflight scoping (P0.5), the visual-regression + Web-Vitals CI lanes (#18), and the ADR-017 Phase-4 renderer swap. None should be shipped without visual verification.
