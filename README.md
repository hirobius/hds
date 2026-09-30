# Hirobius Design System

[![CI](https://github.com/hirobius/hds/actions/workflows/ci.yml/badge.svg)](https://github.com/hirobius/hds/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@hirobius/design-system)](https://www.npmjs.com/package/@hirobius/design-system) [![Storybook](https://img.shields.io/badge/Storybook-live-ff4785)](https://hirobius-design-system.vercel.app)

React + TypeScript component library on a governed design-token pipeline. Live Storybook: **<https://hirobius-design-system.vercel.app>**

```bash
pnpm add @hirobius/design-system
```

[![Buttons under the Brand and Theme dials: base and accent-lilac, light and dark](docs/images/storybook-brand-theme-dials.png)](https://hirobius-design-system.vercel.app)

<!-- auto:start:front-door-counts -->

- **109** public component modules, exported from `src/index.ts`
- **379** DTCG tokens in `hirobius.tokens.json`, compiled to CSS variables and TypeScript constants
- **455** Storybook stories in **115** story files

<!-- auto:end:front-door-counts -->

- Theming through four root attributes and CSS variables (theme, density, brand, font) that need no JavaScript
- Deterministic gates in git hooks and CI: typecheck, zero-warning ESLint, token validity and contrast, Vitest unit and contract tests, bundle budgets, a consumer smoke build, and a Storybook build

The counts are generated from source by `pnpm readme:counts`, which `pnpm tokens` also runs. `scripts/__tests__/front-door.test.mjs` fails if this README claims more than the source has.

## Using the published package

Installing HDS in another project? It ships to the **public npm registry** as
`@hirobius/design-system` (ESM) — no `.npmrc`, no token, no registry config. Full
guide: **[docs/CONSUMING.md](docs/CONSUMING.md)**.

> **Not on GitHub Packages.** This repo's **Packages** sidebar still shows an old
> `@hirobius/design-system` entry under GitHub Packages
> (`/pkgs/npm/design-system`). That listing is **frozen and no longer updated** —
> publishing moved to the public npm registry in
> [#39](https://github.com/hirobius/hirobius-design-system/pull/39). Always
> install from npm:
> **[npmjs.com/package/@hirobius/design-system](https://www.npmjs.com/package/@hirobius/design-system)**.

The short version:

```bash
npm install @hirobius/design-system react react-dom
# react-router is an OPTIONAL peer — only if you want HDS links to drive your router
```

```tsx
// once at the app root — full bundle: tokens + theme + utilities + embedded fonts
import '@hirobius/design-system/tokens.css';
import { Button } from '@hirobius/design-system';

// add data-hds to the root (or any section) so the scoped base styles apply
export const App = () => (
  <div data-hds>
    <Button>Get started</Button>
  </div>
);
```

No router, Tailwind config, or font files needed. With a router, inject it once
via `<HdsRouterProvider>`. See **[docs/CONSUMING.md](docs/CONSUMING.md)** for the
router seam, `data-hds` scoping, and MUI coexistence.

### Theming: the four dials

HDS theming is driven by root attributes + CSS variables, so it works with **zero
JavaScript** — set them on any element (React, Astro, plain HTML) and every HDS
descendant re-skins:

| Dial    | Attribute / var                                | Values          | Default              |
| ------- | ---------------------------------------------- | --------------- | -------------------- |
| theme   | `data-theme`                                   | `dark`          | light (unset)        |
| density | `data-density`                                 | `compact`       | comfortable (unset)  |
| brand   | `data-brand` (+ `data-tenant` alias)           | overlay slug    | base (unset)         |
| font    | `--hds-font-family` / `--hds-font-family-mono` | any font-family | Satoshi / Geist Mono |

```html
<!-- zero-JS: static markup (e.g. an Astro layout) -->
<div
  data-hds
  data-theme="dark"
  data-density="compact"
  data-brand="acme"
  style="--hds-font-family: 'Inter', sans-serif"
>
  …
</div>
```

React apps can set the same contract declaratively with the typed
`<HdsThemeProvider>` (renders the `data-hds` scope wrapper) and read it back with
`useHdsTheme()` — it is a convenience, not a requirement:

```tsx
import { HdsThemeProvider } from '@hirobius/design-system';

<HdsThemeProvider theme="dark" density="compact" brand="acme">
  <App />
</HdsThemeProvider>;
```

## Figma ↔ code

Code is the source of truth, and sync runs one way, from code to Figma. What exists today:

- **Tokens → Figma model:** `pnpm figma:model` projects `hirobius.tokens.json` into `figma/model.json` — the Primitives, Semantic (Light/Dark), Component, Role, Brand and Density collections, plus text and effect styles. Light and Dark keep their own values.
- **Model → Figma file:** `pnpm figma:push` writes the upsert scripts that apply that model to a Figma file, and `pnpm figma:native-import` writes DTCG files for Figma's own Variables ▸ Import. Both are run by hand — no workflow pushes to Figma. The runbook is [`figma/README.md`](figma/README.md).
- **Figma → repo:** `pnpm figma:snapshot --ingest` records the file's state in `figma/snapshot.json`, and `pnpm check:figma-drift` compares the model against that committed snapshot. A hand edit in Figma is drift, not a source change.
- **Legacy export:** `pnpm figma-variables` still writes the older plugin and REST export files, now projected from the same model.
- **Components → Code Connect:** the v2 templates live in the repo, but no Code Connect mapping is published, so Dev Mode shows no snippets. Publishing Code Connect needs a Figma Organization plan.

What each Figma plan allows, and the Pro-plan architecture this follows, are in [ADR-025](docs/adr/025-figma-sync-pro-architecture.md).

## Developing this repo

```bash
pnpm install
# Generated data files are gitignored; create them once (the same step CI runs):
node scripts/generate-manifest.mjs && node scripts/generate-component-api.mjs && node scripts/enrich-manifest.mjs && node scripts/sync-icons.mjs && node scripts/audit-tokens.mjs --full
pnpm storybook   # component workbench on http://localhost:6006
```

Core verification commands:

```bash
pnpm typecheck
pnpm lint
pnpm test              # pretest gates + unit + contract tests, exactly as the pre-push hook and CI run them
pnpm tokens:verify
pnpm check:size
pnpm build-storybook
```

## Architecture

HDS is built around three structural rules:

- **Strict semantics** — public surfaces prefer system primitives such as `Stack`, `Grid`, `Surface`, and `TextLockup` instead of raw layout divs or ad hoc CSS.
- **Polymorphism** — primitives preserve semantic HTML while staying composable through governed APIs such as `forwardRef`, `as`, and layout slots.
- **12-column grid** — page structure follows a consistent editorial grid: readable center columns, intentional breakout zones, and explicit `gap` ownership rather than one-off spacing math.

Source-of-truth files:

- `hirobius.tokens.json` — token values and alias chain.
- `public/hds-manifest.json` — machine-readable system inventory, metadata, and docs linkage.
- `src/app/data/component-api.json` — generated prop tables and reflected component API.
- `DESIGN.md` — lean visual spec for agents and engineers.
- `DESIGN-HANDOFF.md` — verbose visual mirror for handoff and review.

Component-by-component Figma links live in [docs/DESIGN_LINKS.md](docs/DESIGN_LINKS.md), generated by `pnpm figma:links`.

## Accessibility

What CI and the hooks check today, and nothing more:

- **Contrast:** `scripts/check-contrast.mjs` enforces WCAG AA contrast on the core token pairs, in light and dark. It runs in CI and the pre-commit hook.
- **Lint:** `jsx-a11y` rules run inside ESLint with zero warnings allowed.
- **Focus:** `scripts/check-focus-states.mjs` (`pnpm check:focus`) audits focus styles on interactive components. It runs in the agent gate and on demand, not in the main CI workflow, and currently reports 1 violation (`src/app/components/asset-img.tsx`).
- **Storybook:** the `addon-a11y` panel shows axe results for each story while you review it. It reports; it does not gate.

There is no automated screen-reader testing.

## Visual direction: Editorial Enterprise

The governing direction is "Editorial Enterprise" — enterprise rigor with editorial pacing. It favors sharp hierarchy, open whitespace, monochrome neutrals, and a single electric-blue accent. In practice:

- documentation reads like a designed publication, not a component dump
- cards are used sparingly; whitespace, rails, dividers, and bands carry structure first
- motion clarifies rather than decorates
- surfaces, spacing, and type are token-governed, so the visual language stays coherent across the docs site and any consuming app

## Verification workflow

The gates are deterministic and need no browser or live site:

- **pre-commit** (`.husky/pre-commit`): secrets scan, Prettier on staged files, typecheck, zero-warning ESLint, and token validity and contrast.
- **pre-push** (`.husky/pre-push`): `pnpm test` (the pretest gates, then Vitest unit and contract tests), then the consumer smoke build (library build, subpath resolution, publint, consumer typecheck).
- **CI** (`.github/workflows/ci.yml`): typecheck, zero-warning ESLint, token validity and contrast, Vitest, and the consumer smoke build, plus bundle budgets and a Storybook build.
- **Visual review:** Storybook is the visual verification surface, reviewed by hand. The earlier browser test suite drove a docs site that no longer exists and was removed (ADR-018).

`CLAUDE.md` is the operating contract for agents working in this repo.

## Bundle and release hygiene

- `pnpm check:size` builds the library bundle and runs `size-limit`.

Releases are cut with [Changesets](https://github.com/changesets/changesets). A pull request that changes the published package adds a changeset (`pnpm changeset:add`). On a push to `main`, `.github/workflows/release.yml` opens or updates a "Version Packages" PR, and merging that PR publishes the new version to public npm.

## Repository shape

```text
src/
  app/
    components/
    layouts/
    pages/
  styles/
scripts/
docs/
public/
```

## Primary docs

- [`docs/CONSUMING.md`](docs/CONSUMING.md) — installing & using the published package
- `CLAUDE.md` — agent operating contract
- `DESIGN.md` — lean visual spec
- `DESIGN-HANDOFF.md` — verbose visual mirror
- `TOKEN_GOVERNANCE.md` — token system rules
- `SYSTEMS_REGISTRY.md` — systems & guardrail registry

## License

The HDS code is MIT ([LICENSE](LICENSE)). The package CSS also embeds the Satoshi and Geist Mono fonts, which keep their own licenses and are not covered by MIT. See [NOTICE.md](NOTICE.md).
