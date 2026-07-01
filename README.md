# Hirobius Design System

A publishable React + TypeScript component library, backed by a governed design-token pipeline, a documentation site, and an automated verification suite — all in one repository.

## Using the published package

Installing HDS in another project? It ships to the **public npm registry** as
`@hirobius/design-system` (ESM) — no `.npmrc`, no token, no registry config. Full
guide: **[docs/CONSUMING.md](docs/CONSUMING.md)**. The short version:

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

## Developing this repo

```bash
pnpm install
pnpm dev
```

Core verification commands:

```bash
pnpm typecheck
pnpm run heal
pnpm test:layout
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
