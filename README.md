# Hirobius Design System

[![npm](https://img.shields.io/npm/v/@hirobius/design-system)](https://www.npmjs.com/package/@hirobius/design-system) [![Docs](https://img.shields.io/badge/Docs-live-000000)](https://hirobius-hds-components.vercel.app)

HDS is a governed, token-first React design system: components plus a DTCG token pipeline (CSS variables and TypeScript constants), quality gates in git hooks, one-way Figma sync, and WCAG-checked contrast and focus. Live docs: <https://hirobius-hds-components.vercel.app>

Install: `pnpm add @hirobius/design-system`. Upgrading: [UPGRADING.md](UPGRADING.md). From 0.22.0, `npx @hirobius/design-system@latest upgrade` does it for you.

[![Buttons under the Brand and Theme dials: base and accent-lilac, light and dark](docs/images/brand-theme-dials.png)](https://hirobius-hds-components.vercel.app)

<!-- auto:start:front-door-counts -->

- **63** public component modules, exported from `src/index.ts`
- **552** DTCG tokens in `hirobius.tokens.json`, compiled to CSS variables and TypeScript constants

<!-- auto:end:front-door-counts -->

- **Token pipeline:** a validated alias chain with AA-contrast gates in light and dark.
- **Gates with proof-of-firing:** typecheck, zero-warning ESLint, token and contrast checks, Vitest and a consumer smoke build; many gates carry fixtures proving they fire.
- **Theming without JavaScript:** four root attributes re-skin every HDS descendant.

`pnpm readme:counts` generates the counts; `scripts/__tests__/front-door.test.mjs` fails if they overclaim. How it is built: [docs/ENGINEERING.md](docs/ENGINEERING.md). Agents: `npx skills add hirobius/hds --skill hds-consumer`.

## In use

<!-- auto:start:consumer-usage -->

An internal operations dashboard is one of 2 product apps that use components: **33** of its source files import from `@hirobius/design-system`, using **24** distinct components. The screenshot below is a page of that app, rendered from its `main` branch.

| Consumer kind     | Count | How it uses HDS                           |
| ----------------- | ----- | ----------------------------------------- |
| Product apps      | 2     | Components and tokens                     |
| Token-level sites | 4     | Tokens and CSS only, no component imports |

Month-by-month adoption in each product app, one row per measured commit: [docs/ADOPTION.md](docs/ADOPTION.md).

[![Audit page of the product app](docs/images/product-app-audit.png)](docs/images/product-app-audit.png)

<!-- auto:end:consumer-usage -->

`pnpm consumer:usage --root <consumer checkout>` measures a checkout's `src/` and records its commit in `docs/data/consumer-usage.json`; without a root it reuses that snapshot. Roleflame is the second product app. Deprecated aliases count as their target, `promptContracts` are listed but not counted, and `scripts/__tests__/consumer-usage.test.mjs` fails on drift.

## What belongs in the system

<!-- auto:start:core-set -->

**48** components are the core set: the brand-neutral, composable surface every HDS screen is built from, and the part of the system that has to be excellent. Import them from the package root; each carries `core: true` in `public/hds-manifest.json`.

- **Actions:** `Button`
- **Display:** `Avatar`, `Card`, `EmptyState`, `Field`, `Icon`, `Kbd`, `List`, `Table`, `Timeline`
- **Feedback:** `Alert`, `Badge`, `Progress`, `Skeleton`, `Spinner`, `ToastProvider`
- **Inputs:** `Checkbox`, `Combobox`, `Input`, `Radio`, `SegmentedControl`, `Select`, `Slider`, `Tag`, `Textarea`, `Toggle`
- **Layout:** `Box`, `Container`, `Disclosure`, `Divider`, `Grid`, `Stack`, `Surface`
- **Navigation:** `Breadcrumb`, `InlineLink`, `NavList`, `Pagination`, `Tabs`
- **Overlays:** `CommandPalette`, `Dialog`, `Menu`, `Popover`, `Tooltip`
- **Theming:** `HdsRouterProvider`, `HdsThemeProvider`
- **Typography:** `MetaLine`, `Text`
- **Utility:** `VisuallyHidden`

**14** pattern modules ship from `@hirobius/design-system/patterns`, and only from there: composed surfaces that assume a product (page shells, forms, code blocks, page sections), built from the core set. One name per module; its parts and props types come with it.

`AppShell`, `AssetImg`, `AsyncState`, `CodeBlock`, `DataTableSection`, `DestructiveSection`, `ErrorPattern`, `Form`, `FormActions`, `MetricTiles`, `Page`, `PageHeader`, `Reveal`, `StatusTile`

The package root also exports the rest of the allow-list (compound parts, and the components outside the core set; the [consumer skill](skills/hds-consumer/SKILL.md) lists them by category): reach for the core set first. 0.20.0 removed the root re-exports of the pattern modules, the docs internals and 13 components that fold into a survivor ([MIGRATIONS.md](MIGRATIONS.md#0200-removals-2026-10-01)). Deprecated, exported only until removed: `CardMetric` (removed in 1.0.0), `MetricTile` (removed in 1.0.0), `MetricTiles` (removed in 1.0.0), `Stat` (removed in 1.0.0), `StatusTile` (removed in 1.0.0).

Every component's disposition (core, pattern, fold or internal) is in the [architecture doc](docs/hds-architecture-2026-09-18.html), ratified 2026-09-26 in [hds#254](https://github.com/hirobius/hds/issues/254); [ADR-031](docs/adr/031-core-set-and-dispositions.md) records the decision and what has changed since.

<!-- auto:end:core-set -->

`pnpm readme:counts` generates this section; `scripts/__tests__/core-set.test.mjs` fails on drift.

## Using the published package

HDS ships to public npm as `@hirobius/design-system` (ESM), with no `.npmrc` or token needed. The frozen entry under GitHub **Packages** predates [#39](https://github.com/hirobius/hds/pull/39); ignore it.

```bash
npm install @hirobius/design-system react react-dom   # react-router is an optional peer
```

```tsx
import '@hirobius/design-system/tokens.css';
import '@hirobius/design-system/fonts.css'; // optional brand fonts
import { Button } from '@hirobius/design-system';

// data-hds scopes the base styles
export const App = () => (
  <div data-hds>
    <Button>Get started</Button>
  </div>
);
```

### Theming: the four dials

Set these attributes on any element and HDS descendants re-skin:

| Dial    | Attribute / var                                | Values          | Default                           |
| ------- | ---------------------------------------------- | --------------- | --------------------------------- |
| theme   | `data-theme`                                   | `dark`          | light (unset)                     |
| density | `data-density`                                 | `compact`       | comfortable (unset)               |
| brand   | `data-brand` (+ `data-tenant` alias)           | overlay slug    | base (unset)                      |
| font    | `--hds-font-family` / `--hds-font-family-mono` | any font-family | Plus Jakarta Sans / IBM Plex Mono |

The router seam (`HdsRouterProvider`), `HdsThemeProvider`, scoping and MUI coexistence: [docs/CONSUMING.md](docs/CONSUMING.md).

## Figma ↔ code

Code is the source of truth; sync runs one way. `pnpm figma:model` projects tokens into `figma/model.json`; `pnpm figma:push` and `pnpm figma:native-import` apply it by hand ([`figma/README.md`](figma/README.md)); `pnpm figma:snapshot --ingest` plus `pnpm check:figma-drift` catch hand edits in Figma. Per-component Figma links: [docs/DESIGN_LINKS.md](docs/DESIGN_LINKS.md). Code Connect templates exist but are unpublished (needs an Organization plan). Plans and architecture: [ADR-025](docs/adr/025-figma-sync-pro-architecture.md).

## Developing this repo

```bash
pnpm install
# generated data files are gitignored; create them once:
node scripts/generate-manifest.mjs && node scripts/generate-component-api.mjs && node scripts/enrich-manifest.mjs && node scripts/sync-icons.mjs && node scripts/audit-tokens.mjs --full
pnpm docs:dev   # docs site with live demos
pnpm test       # pretest gates + unit + contract tests, as the pre-push hook runs them
```

Hooks: **pre-commit** runs gitleaks (if installed), Prettier, typecheck, ESLint and token/contrast checks; **pre-push** runs the tiered gate (`scripts/pre-push-gate.mjs`): the full tier is `pnpm check:fast`, `pnpm test` and the consumer smoke build; smaller diffs run a lighter tier (`scripts/lib/gate-tier.mjs`). GitHub Actions is off, so run `pnpm check:size` and the docs-site axe gate (`pnpm check:docs-axe`) by hand. Releases use [Changesets](https://github.com/changesets/changesets) ([docs/RELEASING.md](docs/RELEASING.md)).

## Architecture

Component dispositions (core, pattern, fold, internal) are set in the [architecture doc](docs/hds-architecture-2026-09-18.html) and [ADR-031](docs/adr/031-core-set-and-dispositions.md). Sources of truth: `hirobius.tokens.json` (tokens), `public/hds-manifest.json` (inventory), `src/app/data/component-api.json` (props), [DESIGN.md](DESIGN.md) (visual spec, "Editorial Enterprise"), `TOKEN_GOVERNANCE.md`, `docs/guardrails/registry.json` (gates) and `docs/state-surfaces.json` (state). Agents working here start at [docs/ai/FRONT-DOOR.md](docs/ai/FRONT-DOOR.md) and `CLAUDE.md`; [AGENTS.md](AGENTS.md) is for agents building with the package.

## Accessibility

- **Contrast:** `scripts/check-contrast.mjs` enforces WCAG AA on core token pairs, light and dark (pre-commit).
- **Lint:** `jsx-a11y` with zero warnings.
- **Focus:** `scripts/check-focus-states.mjs` (`pnpm check:focus`) audits interactive components in `pretest` and passes with 0 violations.
- **Docs site:** `scripts/check-docs-axe.mjs` (`pnpm check:docs-axe`) scans every component and pattern demo, light and dark; serious or critical violations outside `scripts/docs-axe-allowlist.json` (empty) fail.
- **Announcements:** `tests/primitive-contracts/screen-reader.contract.test.tsx` walks Dialog, Menu, Select, Combobox, Table and Alert with a virtual reader under jsdom (not real assistive tech).

## Open explorations

Work in progress, shown as it stands — questions the system is still testing,
not features it promises.

### Delight directions

Could HDS be more playful without losing its discipline? A static page renders
three directions, subtle to bold, on the current tokens with page-scoped
overrides, and measures token reach and AA contrast for each:
[`docs/explorations/2026-10-delight/index.html`](docs/explorations/2026-10-delight/index.html).
No token has changed.

### Agent consistency

Can the public docs alone make different agents build the same screen? Three
agents build one Client-detail screen from the docs, and `pnpm eval:consistency`
compares the results: builds, token violations, axe, component-set overlap
(Jaccard) and pixel diff. Today it runs the offline half over a directory of
apps (`pnpm eval:consistency -- --apps <dir> --offline`: violations and Jaccard
from source only). Spec, thresholds and ledger:
[`eval/consistency/`](eval/consistency/README.md). The latest recorded run, as
printed by `pnpm eval:consistency -- --summary`:

```text
Agent consistency 2026-10-31 (harness, design-system 0.32.0): FAIL - builds 2/3, violations 0, axe 0, Jaccard min 1 (limit >= 0.85), light diff not measured (an app did not build)
```

The latest run still misses a threshold, and they stay where they are: the useful
output is where the agents diverge, which points at the docs to fix next. The
eval measures the docs; it does not gate merges or constrain how agents work.

## License

MIT ([LICENSE](LICENSE)). The embedded Plus Jakarta Sans and IBM Plex Mono fonts keep their own licenses: [NOTICE.md](NOTICE.md).
