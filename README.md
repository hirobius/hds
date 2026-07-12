# Hirobius Design System

HDS is under active development (unfrozen 2026-07-10; see [#155](https://github.com/hirobius/hds/issues/155)), currently burning down [epic #124](https://github.com/hirobius/hds/issues/124), the Tailwind × multi-tenant token-utility hardening pass. 133 components (Radix + `cva`), 351+ DTCG tokens, ~110 Storybook stories, a full guardrail suite, and the published `@hirobius/design-system` on npm.

A publishable React + TypeScript component library, backed by a governed design-token pipeline, a documentation site, and an automated verification suite — all in one repository.

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

## Developing this repo

```bash
pnpm install
pnpm dev
```

Core verification commands:

```bash
pnpm typecheck
pnpm run heal
pnpm test
pnpm check:size
```

## Architecture

HDS is built around three structural rules:

- **Strict semantics** — public surfaces prefer system primitives such as `HdsStack`, `HdsGrid`, `HdsSurface`, `HdsTextLockup`, `DocLayout`, and `CaseStudyLayout` instead of raw layout divs or ad hoc CSS.
- **Polymorphism** — primitives preserve semantic HTML while staying composable through governed APIs such as `forwardRef`, `as`, and layout slots.
- **12-column grid** — page structure follows a consistent editorial grid: readable center columns, intentional breakout zones, and explicit `gap` ownership rather than one-off spacing math.

Source-of-truth files:

- `hirobius.tokens.json` — token values and alias chain.
- `public/hds-manifest.json` — machine-readable system inventory, metadata, and docs linkage.
- `src/app/data/component-api.json` — generated prop tables and reflected component API.
- `DESIGN.md` — lean visual spec for agents and engineers.
- `DESIGN-HANDOFF.md` — verbose visual mirror for handoff and review.

## Visual direction: Editorial Enterprise

The governing direction is "Editorial Enterprise" — enterprise rigor with editorial pacing. It favors sharp hierarchy, open whitespace, monochrome neutrals, and a single electric-blue accent. In practice:

- documentation reads like a designed publication, not a component dump
- cards are used sparingly; whitespace, rails, dividers, and bands carry structure first
- motion clarifies rather than decorates
- surfaces, spacing, and type are token-governed, so the visual language stays coherent across the docs site and any consuming app

## Verification workflow

Regression prevention is layered:

- `CLAUDE.md` is the operating contract — agent execution protocol, UI guardrails, required validation steps, and the self-heal requirement before a task is considered done.
- `scripts/self-heal.mjs` (`pnpm run heal`) runs the local static and smoke checks, captures failures, and gives a consistent path to fix type, layout, and runtime drift.
- The Playwright suite covers accessibility, layout integrity, collision detection, responsiveness, and visual regression, so changes that break containment, overlap, or responsive behavior fail automatically.

Typical loop:

1. Change code within the token and component constraints.
2. Run `pnpm typecheck` and `pnpm run heal`.
3. Let Playwright catch runtime and visual regressions.
4. If self-healing fixes a regression, log the root cause and resolution.
5. Update the verification checklist and ship.

## Bundle and release hygiene

- `pnpm check:size` builds the library bundle and runs `size-limit`.
- `pnpm check:release` runs the full release gate (accessibility, responsive, collision, visual, and bundle-size checks).

Releases are cut with [Changesets](https://github.com/changesets/changesets): a merged changeset opens a "Version Packages" PR, and merging that PR publishes the new version to public npm via `.github/workflows/release.yml`.

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
