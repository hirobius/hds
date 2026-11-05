# Consuming `@hirobius/design-system`

The design system ships as an ESM package published to the **public npm
registry**. This guide is for apps that want to use the components, tokens, and
helpers.

> For the full consumption guide (styles, `data-hds` scoping, routing seam, MUI
> interop, forms, troubleshooting) see [`docs/CONSUMING.md`](docs/CONSUMING.md).

## 1. Install

No registry config, `.npmrc`, or auth token is required — it's public npm:

```bash
pnpm add @hirobius/design-system
# peer dependencies (the consuming app provides these singletons):
pnpm add react react-dom
# react-router is an OPTIONAL peer — only if you drive links through your router
```

The package also pulls in its own runtime deps (Radix, lucide-react, motion,
clsx, class-variance-authority, tailwind-merge) automatically. Import icons
from `@hirobius/design-system/icons` (a curated Lucide set, nothing extra to
install); for an icon outside it, install `lucide-react@0.487.0` (the same
version keeps the `LucideIcon` type identical).

## 2. Use

```tsx
import { Button, Card, Dialog } from '@hirobius/design-system';
import '@hirobius/design-system/tokens.css'; // required — design tokens as CSS vars
import '@hirobius/design-system/fonts.css'; // optional — the HDS brand fonts (Plus Jakarta Sans, IBM Plex Mono)

export function Example() {
  return (
    <Card>
      <Button variant="primary">Hello</Button>
    </Card>
  );
}
```

Available subpaths:

| Import                                      | What                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hirobius/design-system`                   | The 48-component core set ([README → What belongs in the system](README.md#what-belongs-in-the-system)), the rest of the allow-list and the templates; the `pattern` tier is only in `/patterns`                                                                                                                                |
| `@hirobius/design-system/fonts.css`         | Optional brand fonts (Plus Jakarta Sans, IBM Plex Mono); woff2 files ship in the package, relative URLs, `font-display: swap`                                                                                                                                                                                                   |
| `@hirobius/design-system/tokens.css`        | Token CSS variables (import once at app root)                                                                                                                                                                                                                                                                                   |
| `@hirobius/design-system/tokens`            | Token values as TS constants                                                                                                                                                                                                                                                                                                    |
| `@hirobius/design-system/cn`                | `cn()` class-merge helper                                                                                                                                                                                                                                                                                                       |
| `@hirobius/design-system/manifest`          | The HDS manifest JSON                                                                                                                                                                                                                                                                                                           |
| `@hirobius/design-system/stats.json`        | Generated HDS numbers (component, core, pattern and token counts, contrast pairs, typography styles, consumer split), each computed from the code (`hds-stats.json`)                                                                                                                                                            |
| `@hirobius/design-system/deprecations.json` | The shipped deprecation record: deprecated exports, props, prop values and tokens with their `@removeIn` versions, plus the names each release already removed — generated from the `@deprecated` JSDoc, the tokens and the upgrade ledgers (`deprecations.json`); the `hds/no-removed-import` lint rule reads its removed list |
| `@hirobius/design-system/contexts`          | Theme / language / tenant / font providers                                                                                                                                                                                                                                                                                      |
| `@hirobius/design-system/brand`             | Palette → HDS-semantic overlay bridge (static / SSR / Astro; see [`docs/CONSUMING.md` §12](docs/CONSUMING.md#12-static-astro-sites--the-brand-overlay-bridge))                                                                                                                                                                  |
| `@hirobius/design-system/scroll`            | Opt-in scroll-motion primitives — `SmoothScroll` (Lenis), `useScrollProgress` (Motion). Requires the optional peer `lenis`. See [`docs/CONSUMING.md` §13](docs/CONSUMING.md#13-scroll-motion-the-scroll-subpath)                                                                                                                |
| `@hirobius/design-system/patterns`          | The 14 pattern modules: the hds#254 `pattern` tier (page shells, forms, code blocks, page sections). The only entry that exports them: 0.20.0 removed their root re-exports (the `hds-patterns-subpath` codemod, see MIGRATIONS.md).                                                                                            |
| `@hirobius/design-system/icons`             | Curated Lucide icon set for `Icon`, and so for `Button iconOnly` (`Ellipsis`, `Pencil`, `Trash2`, `X`, …). Names listed in the manifest `iconSet`.                                                                                                                                                                              |
| `@hirobius/design-system/static.css`        | CSS-only static-primitive layer — `.hds-badge`/`.hds-card`/`.hds-alert`/`.hds-divider`/`.hds-tag` classes, no React. See [`docs/CONSUMING.md` §14](docs/CONSUMING.md#14-css-only-static-primitives--badgecardalertdividertag-with-no-react)                                                                                     |
| `@hirobius/design-system/tailwind-preset`   | Tailwind theme preset for an app that compiles its own Tailwind: `presets: [hds]` instead of a copied `tailwind.config.tokens.cjs`. See [`docs/CONSUMING.md`](docs/CONSUMING.md#your-own-tailwind-build--tailwind-preset)                                                                                                       |

The package is **ESM-only**, so consume it with a modern bundler (Vite, Next.js,
Remix, Webpack 5+) or a Node ≥ 20 ESM runtime. Built `.d.ts` declarations ship in
`dist/types`, so TypeScript consumers get full types with no extra config.
The floor is **TypeScript 5.6**: `pnpm smoke:consumer` typechecks a consumer at
5.6 and at the newest TypeScript the repo pins, under React 18.3 and React 19.

Every component's props type is exported under its own name — `AlertProps`,
`ButtonProps`, `GridProps`, and so on — so wrapping one needs no
`React.ComponentProps<typeof X>`:

```tsx
import { Alert, type AlertProps } from '@hirobius/design-system';

export const Notice = (props: AlertProps) => <Alert tone="info" {...props} />;
```

Types that are implementation detail stay internal on purpose: the cva variant
aliases, composition bases, and the props of sub-components the package does not
export.

**Next.js App Router / React Server Components.** Every React-bearing entry — the
main barrel, `contexts`, `form`, `scroll`, `patterns` — ships with `'use client'`, so you can
import components straight into a Server Component and they render as client
components with no wrapper. The framework-free subpaths — `tokens`, `cn`,
`manifest`, `brand`, `mui` — deliberately carry **no** directive: they have no
React in them, and marking them would turn their exports into opaque client
references when you use them on the server (`tokens.color.primary` in a layout,
`brand` at the edge). Import those from server code freely.

**Density.** Put `data-density="compact"` on the same `[data-hds]` scope element (or `<html>`) to tighten `semantic.space.scale.*`, surface padding and region gutter; `Table` follows it unless given a `density` prop.

### What you may select on

In tests and styles, select HDS elements only by:

- Role and accessible name, as a screen reader meets them: `getByRole('button', { name: 'Save' })`.
- ARIA states such as `aria-checked`, `aria-selected`, `aria-expanded` and `aria-disabled`.
- The `data-*` attributes a component lists in the manifest's `publicDataAttributes`, such as `data-state`, `data-variant`, `data-size`, `data-tone` and `data-slot`. Not `data-hds-*`, which are internal, or `data-radix-*`, which belong to Radix.
- The `hds-*` classes and the manifest's `publicClasses`, which the CSS contract tracks.
- Never other class names, ids, tag names or how elements nest: those change without an upgrade step.

A change to a role, a name, a state or a `data-*` value ships as a `behavior`
upgrade step whose detect pattern finds the code that relied on it, so
`npx @hirobius/design-system@latest upgrade --check` points you at it. The
record is [`docs/baselines/dom-a11y.json`](docs/baselines/dom-a11y.json), one
entry per docs demo.

### Token names and size vs space

Never guess a token name: `pnpm exec hds-tokens search content tertiary` says whether
a name exists and lists the nearest real ones. Size vs space: `semantic.size.*`
is an element's own width or height, `semantic.space.*` is the gap or padding
between and inside elements. Details: [`docs/CONSUMING.md`](docs/CONSUMING.md) §7.

## 2.5. Lint discipline (optional)

`@hirobius/eslint-plugin-hds` flags raw hex/px values in `style`, `className`,
and `Box` `sx` props so token discipline shows up in your editor, not just at
review time. See [`docs/CONSUMING.md` §11](docs/CONSUMING.md#11-lint-discipline--the-consumer-eslint-plugin)
and [`scripts/eslint-plugin-hds/README.md`](scripts/eslint-plugin-hds/README.md).

For plain HTML/CSS/JS sites, `pnpm exec hds-check .` runs HDS's visual rules
(no all caps, HDS fonts only, shadow and color tokens only) and exits 1 with
file:line findings. In CI: `- run: pnpm exec hds-check .`. See
[`docs/CONSUMING.md` §11](docs/CONSUMING.md#any-html-css-or-js-site-hds-check).

## 2.6. Agent context

The package ships the docs written for agents, so an agent in your repo can read
them without network access. Under `node_modules/@hirobius/design-system/`:

- `llms.txt` (also `public/llms.txt`) - the system map and index of topic slices in `public/llms/`
- `public/llms-full.txt` - the map, the full `DESIGN.md` and a props digest for every component
- `DESIGN.md` - the lean visual spec
- `src/app/data/component-api.json` - full prop reference

The same files are served at <https://hirobius-hds-components.vercel.app/llms.txt>
(and `/llms-full.txt`, `/llms/components.txt`, `/DESIGN.md`, `/component-api.json`).

## 3. Receiving updates

Releases follow [semver](https://semver.org/). Below 1.0 a breaking change
ships in a 0.x minor, which `pnpm update` and a caret range such as `^0.21`
never pick up, so upgrade to an exact version.

From 0.22.0, one command does it:

```bash
npx @hirobius/design-system@latest upgrade
```

It finds the version you have, moves you to the newest release, runs the
codemods and lists what is left to do by hand.

Until then, upgrade by hand with [UPGRADING.md](UPGRADING.md), which also ships
in the package:

1. Install the exact version: `pnpm add @hirobius/design-system@<version>`.
2. For each release you cross, run the codemods UPGRADING.md lists under
   "Fixed for you".
3. Work through its "Do by hand" list.

UPGRADING.md covers every release after 0.16.0. From an older version, first
reach 0.16.0 with the notes in [CHANGELOG.md](CHANGELOG.md);
[MIGRATIONS.md](MIGRATIONS.md) has longer guides for the big releases.
`CHANGELOG.md` has the full notes, and each section from 0.22.0 on opens with
an Upgrade block.

---

### Maintainers: cutting a release

```bash
pnpm changeset add        # record a patch/minor/major bump + notes
pnpm changeset:version    # on a branch: apply bumps, regenerate CHANGELOG.md, record the release (scripts/upgrade/compile.mjs) and refresh docs/api/api-baseline.json
# open the "Version Packages" PR; after review + merge, on a clean main:
pnpm release:local --publish   # owner only, npm 2FA
```

GitHub Actions is disabled on this repo (2026-10-30), so
`.github/workflows/release.yml` never runs and releases carry no npm provenance.
The full steps are in [docs/RELEASING.md](docs/RELEASING.md). The Trusted
Publishing and `RELEASE_PAT` notes below describe that dormant workflow.

A bad release is deprecated, not unpublished: [docs/RELEASING.md](docs/RELEASING.md),
"If a release is bad", has the commands and `pnpm release:yank`.

Publishing to npm uses **Trusted Publishing (OIDC)**: no npm token exists. The
package's Trusted Publisher entry on npmjs.com (org `hirobius`, repo `hds`,
workflow `release.yml`, no environment) lets the workflow mint a short-lived
publish credential per run. If a publish fails with `ENEEDAUTH`/`E404`, that
entry is missing or no longer matches the workflow filename.

One repo secret is required, and the workflow fails loudly naming it if it is
missing or expired:

| Secret        | What it does                                                                                                                                            | If it lapses                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `RELEASE_PAT` | Authors the "Version Packages" PR and pushes tags. A **fine-grained** PAT scoped to `hirobius/hds` with Contents + Pull requests set to Read and write. | The run fails at the guard step, before anything builds. |

`RELEASE_PAT` exists because GitHub does not start workflow runs from events
created with `GITHUB_TOKEN`. With `GITHUB_TOKEN`, `ci.yml` never fires on the
release PR, so the required `Lean gate set` check cannot run and the PR is
unmergeable. A user-owned token is not subject to that guard, so the release PR
is tested like any other PR. Fine-grained tokens expire — when this one does,
the failure names the secret and the fix rather than silently reverting to the
deadlock.
