# Hirobius Design System

A publishable React + TypeScript component library backed by a governed design-token pipeline, published to npm as `@hirobius/design-system`.

<!--
  PLACEHOLDER — ADRIAN TO WRITE (hds front-door PR).
  If you want the README to mention the July–September 2026 pause, put one or
  two sentences here in your own words, then delete this comment. Leaving the
  comment in place publishes nothing. Do not restore the old status line this
  PR removed: CI, release, and Chromatic triggers were restored in #204.
-->

<!-- auto:start:front-door-counts -->

- **109** public component modules, exported from `src/index.ts`
- **359** DTCG tokens in `hirobius.tokens.json`, compiled to CSS variables and TypeScript constants
- **454** Storybook stories in **115** story files, reviewed visually in Chromatic

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
pnpm exec vitest run   # unit + contract tests, as the pre-push hook and CI run them
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

<!-- design-links:start (generated by `pnpm figma:links`; edit the @figma JSDoc tag, not this section) -->

## Design ↔ Code links

Each component has one Figma source: `figmaUrl` in `public/hds-manifest.json`, which `pnpm manifest:generate` sets from the `@figma` tag in the component JSDoc. `pnpm figma:links` keeps this table current and Storybook reads the same field (`parameters.design`). The Figma-side links (dev resources and component descriptions) exist only once someone runs their steps in [`figma/README.md`](figma/README.md).

**44 of 140** components link a Figma node.

| Component          | Figma node                                                                                         | Story                                                                      | Source                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Alert`            | [33:34](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=33-34)   | [alert.stories.tsx](src/stories/alert.stories.tsx)                         | [alert.tsx](src/app/components/alert.tsx)                         |
| `Avatar`           | [34:18](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=34-18)   | [avatar.stories.tsx](src/stories/avatar.stories.tsx)                       | [avatar.tsx](src/app/components/avatar.tsx)                       |
| `Badge`            | [31:15](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=31-15)   | [badge.stories.tsx](src/stories/badge.stories.tsx)                         | [badge.tsx](src/app/components/badge.tsx)                         |
| `Breadcrumb`       | [86:159](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-159) | [breadcrumb.stories.tsx](src/stories/breadcrumb.stories.tsx)               | [breadcrumb.tsx](src/app/components/breadcrumb.tsx)               |
| `Button`           | [28:138](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=28-138) | [button.stories.tsx](src/stories/button.stories.tsx)                       | [button.tsx](src/app/components/button.tsx)                       |
| `Callout`          | [88:85](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-85)   | [callout.stories.tsx](src/stories/callout.stories.tsx)                     | [callout.tsx](src/app/components/callout.tsx)                     |
| `Card`             | [39:11](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=39-11)   | [card.stories.tsx](src/stories/card.stories.tsx)                           | [card.tsx](src/app/components/card.tsx)                           |
| `CodeBlock`        | [89:154](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-154) | [code-block.stories.tsx](src/stories/code-block.stories.tsx)               | [code-block.tsx](src/app/components/code-block.tsx)               |
| `Combobox`         | [82:237](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-237) | [combobox.stories.tsx](src/stories/combobox.stories.tsx)                   | [combobox.tsx](src/app/components/combobox.tsx)                   |
| `Dialog`           | [93:27](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-27)   | [dialog.stories.tsx](src/stories/dialog.stories.tsx)                       | [dialog.tsx](src/app/components/dialog.tsx)                       |
| `Disclosure`       | [88:453](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-453) | [disclosure.stories.tsx](src/stories/disclosure.stories.tsx)               | [disclosure.tsx](src/app/components/disclosure.tsx)               |
| `Divider`          | [89:26](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-26)   | [divider.stories.tsx](src/stories/divider.stories.tsx)                     | [divider.tsx](src/app/components/divider.tsx)                     |
| `EmptyState`       | [88:352](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-352) | [empty-state.stories.tsx](src/stories/empty-state.stories.tsx)             | [empty-state.tsx](src/app/components/empty-state.tsx)             |
| `Field`            | [85:81](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=85-81)   | [field.stories.tsx](src/stories/field.stories.tsx)                         | [field.tsx](src/app/components/field.tsx)                         |
| `Form`             | [85:94](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=85-94)   | [form.stories.tsx](src/stories/form.stories.tsx)                           | [form.tsx](src/app/components/form.tsx)                           |
| `HdsCheckbox`      | [35:29](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=35-29)   | [checkbox.stories.tsx](src/stories/checkbox.stories.tsx)                   | [checkbox.tsx](src/app/components/checkbox.tsx)                   |
| `HdsRadio`         | [36:17](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=36-17)   | [radio.stories.tsx](src/stories/radio.stories.tsx)                         | [radio.tsx](src/app/components/radio.tsx)                         |
| `HdsSelect`        | [82:49](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-49)   | [select.stories.tsx](src/stories/select.stories.tsx)                       | [select.tsx](src/app/components/select.tsx)                       |
| `HdsSlider`        | [82:265](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-265) | [slider.stories.tsx](src/stories/slider.stories.tsx)                       | [slider.tsx](src/app/components/slider.tsx)                       |
| `HdsToggle`        | [37:19](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=37-19)   | [toggle.stories.tsx](src/stories/toggle.stories.tsx)                       | [toggle.tsx](src/app/components/toggle.tsx)                       |
| `IconButton`       | [40:39](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=40-39)   | [icon-button.stories.tsx](src/stories/icon-button.stories.tsx)             | [icon-button.tsx](src/app/components/icon-button.tsx)             |
| `InlineCode`       | [89:155](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-155) | [inline-code.stories.tsx](src/stories/inline-code.stories.tsx)             | [inline-code.tsx](src/app/components/inline-code.tsx)             |
| `InlineLink`       | [89:161](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-161) | [inline-link.stories.tsx](src/stories/inline-link.stories.tsx)             | [inline-link.tsx](src/app/components/inline-link.tsx)             |
| `Input`            | [38:20](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=38-20)   | [input.stories.tsx](src/stories/input.stories.tsx)                         | [input.tsx](src/app/components/input.tsx)                         |
| `Menu`             | [93:59](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-59)   | [menu.stories.tsx](src/stories/menu.stories.tsx)                           | [menu.tsx](src/app/components/menu.tsx)                           |
| `NavGroup`         | [86:304](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-304) | [nav-group.stories.tsx](src/stories/nav-group.stories.tsx)                 | [nav-group.tsx](src/app/components/nav-group.tsx)                 |
| `NavItem`          | [86:258](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-258) | [nav-item.stories.tsx](src/stories/nav-item.stories.tsx)                   | [nav-item.tsx](src/app/components/nav-item.tsx)                   |
| `Pagination`       | [86:194](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-194) | [pagination.stories.tsx](src/stories/pagination.stories.tsx)               | [pagination.tsx](src/app/components/pagination.tsx)               |
| `Popover`          | [93:32](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-32)   | [popover.stories.tsx](src/stories/popover.stories.tsx)                     | [popover.tsx](src/app/components/popover.tsx)                     |
| `Progress`         | [88:91](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-91)   | [progress.stories.tsx](src/stories/progress.stories.tsx)                   | [progress.tsx](src/app/components/progress.tsx)                   |
| `SegmentedControl` | [82:334](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-334) | [segmented-control.stories.tsx](src/stories/segmented-control.stories.tsx) | [segmented-control.tsx](src/app/components/segmented-control.tsx) |
| `SideNav`          | [86:332](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-332) | [side-nav.stories.tsx](src/stories/side-nav.stories.tsx)                   | [side-nav.tsx](src/app/components/side-nav.tsx)                   |
| `Skeleton`         | [88:95](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-95)   | [skeleton.stories.tsx](src/stories/skeleton.stories.tsx)                   | [skeleton.tsx](src/app/components/skeleton.tsx)                   |
| `Spinner`          | [88:106](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-106) | [spinner.stories.tsx](src/stories/spinner.stories.tsx)                     | [spinner.tsx](src/app/components/spinner.tsx)                     |
| `Stat`             | [88:247](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-247) | [stat.stories.tsx](src/stories/stat.stories.tsx)                           | [stat.tsx](src/app/components/stat.tsx)                           |
| `StatusListItem`   | [88:350](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-350) | [status-list-item.stories.tsx](src/stories/status-list-item.stories.tsx)   | [status-list-item.tsx](src/app/components/status-list-item.tsx)   |
| `StatusTile`       | [88:292](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-292) | [status-tile.stories.tsx](src/stories/status-tile.stories.tsx)             | [status-tile.tsx](src/app/components/status-tile.tsx)             |
| `StepperField`     | [82:425](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=82-425) | [stepper-field.stories.tsx](src/stories/stepper-field.stories.tsx)         | [stepper-field.tsx](src/app/components/stepper-field.tsx)         |
| `Surface`          | [89:27](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-27)   | [surface.stories.tsx](src/stories/surface.stories.tsx)                     | [surface.tsx](src/app/components/surface.tsx)                     |
| `Table`            | [89:300](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=89-300) | [table.stories.tsx](src/stories/table.stories.tsx)                         | [table.tsx](src/app/components/table.tsx)                         |
| `Tabs`             | [86:89](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=86-89)   | [tabs.stories.tsx](src/stories/tabs.stories.tsx)                           | [tabs.tsx](src/app/components/tabs.tsx)                           |
| `Tag`              | [32:11](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=32-11)   | [tag.stories.tsx](src/stories/tag.stories.tsx)                             | [tag.tsx](src/app/components/tag.tsx)                             |
| `Textarea`         | [85:14](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=85-14)   | [textarea.stories.tsx](src/stories/textarea.stories.tsx)                   | [textarea.tsx](src/app/components/textarea.tsx)                   |
| `ToastProvider`    | [93:367](https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-367) | [toast.stories.tsx](src/stories/toast.stories.tsx)                         | [toast.tsx](src/app/components/toast.tsx)                         |

<!-- design-links:end -->

## Visual direction: Editorial Enterprise

The governing direction is "Editorial Enterprise" — enterprise rigor with editorial pacing. It favors sharp hierarchy, open whitespace, monochrome neutrals, and a single electric-blue accent. In practice:

- documentation reads like a designed publication, not a component dump
- cards are used sparingly; whitespace, rails, dividers, and bands carry structure first
- motion clarifies rather than decorates
- surfaces, spacing, and type are token-governed, so the visual language stays coherent across the docs site and any consuming app

## Verification workflow

The gates are deterministic and need no browser or live site:

- **pre-commit** (`.husky/pre-commit`): secrets scan, Prettier on staged files, typecheck, zero-warning ESLint, and token validity and contrast.
- **pre-push** (`.husky/pre-push`): Vitest unit and contract tests, then the consumer smoke build (library build, subpath resolution, publint, consumer typecheck).
- **CI** (`.github/workflows/ci.yml`): typecheck, zero-warning ESLint, token validity and contrast, Vitest, and the consumer smoke build, plus bundle budgets and a Storybook build.
- **Visual review:** Storybook is the visual verification surface, and Chromatic (`.github/workflows/chromatic.yml`) runs it on pull requests. The earlier browser test suite drove a docs site that no longer exists; it is archived in `tests-archive/`.

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
