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
import '@hirobius/design-system/fonts.css'; // optional — the HDS brand fonts (Satoshi, Geist Mono)

export function Example() {
  return (
    <Card>
      <Button variant="primary">Hello</Button>
    </Card>
  );
}
```

Available subpaths:

| Import                               | What                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hirobius/design-system`            | The 43-component core set ([README → What belongs in the system](README.md#what-belongs-in-the-system)), the rest of the allow-list and the templates; the `pattern` tier is only in `/patterns`                                            |
| `@hirobius/design-system/fonts.css`  | Optional brand fonts (Satoshi, Geist Mono); woff2 files ship in the package, relative URLs, `font-display: swap`                                                                                                                            |
| `@hirobius/design-system/tokens.css` | Token CSS variables (import once at app root)                                                                                                                                                                                               |
| `@hirobius/design-system/tokens`     | Token values as TS constants                                                                                                                                                                                                                |
| `@hirobius/design-system/cn`         | `cn()` class-merge helper                                                                                                                                                                                                                   |
| `@hirobius/design-system/manifest`   | The HDS manifest JSON                                                                                                                                                                                                                       |
| `@hirobius/design-system/contexts`   | Theme / language / tenant / font providers                                                                                                                                                                                                  |
| `@hirobius/design-system/brand`      | Palette → HDS-semantic overlay bridge (static / SSR / Astro; see [`docs/CONSUMING.md` §12](docs/CONSUMING.md#12-static-astro-sites--the-brand-overlay-bridge))                                                                              |
| `@hirobius/design-system/scroll`     | Opt-in scroll-motion primitives — `SmoothScroll` (Lenis), `useScrollProgress` (Motion). Requires the optional peer `lenis`. See [`docs/CONSUMING.md` §13](docs/CONSUMING.md#13-scroll-motion-the-scroll-subpath)                            |
| `@hirobius/design-system/patterns`   | The 12 pattern modules: the hds#254 `pattern` tier (page shells, forms, code blocks, page sections). The only entry that exports them: 0.20.0 removed their root re-exports (the `hds-patterns-subpath` codemod, see MIGRATIONS.md).        |
| `@hirobius/design-system/icons`      | Curated Lucide icon set for `Icon`, and so for `Button iconOnly` (`Ellipsis`, `Pencil`, `Trash2`, `X`, …). Names listed in the manifest `iconSet`.                                                                                          |
| `@hirobius/design-system/static.css` | CSS-only static-primitive layer — `.hds-badge`/`.hds-card`/`.hds-alert`/`.hds-divider`/`.hds-tag` classes, no React. See [`docs/CONSUMING.md` §14](docs/CONSUMING.md#14-css-only-static-primitives--badgecardalertdividertag-with-no-react) |

The package is **ESM-only**, so consume it with a modern bundler (Vite, Next.js,
Remix, Webpack 5+) or a Node ≥ 20 ESM runtime. Built `.d.ts` declarations ship in
`dist/types`, so TypeScript consumers get full types with no extra config.

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

## 2.5. Lint discipline (optional)

`@hirobius/eslint-plugin-hds` flags raw hex/px values in `style`, `className`,
and `Box` `sx` props so token discipline shows up in your editor, not just at
review time. See [`docs/CONSUMING.md` §11](docs/CONSUMING.md#11-lint-discipline--the-consumer-eslint-plugin)
and [`scripts/eslint-plugin-hds/README.md`](scripts/eslint-plugin-hds/README.md).

## 2.6. Agent context

The package ships the docs written for agents, so an agent in your repo can read
them without network access. Under `node_modules/@hirobius/design-system/`:

- `llms.txt` (also `public/llms.txt`) - the system map and index of topic slices in `public/llms/`
- `public/llms-full.txt` - the map, the full `DESIGN.md` and a props digest for every component
- `DESIGN.md` - the lean visual spec
- `src/app/data/component-api.json` - full prop reference

The same files are served at <https://hirobius-design-system.vercel.app/llms.txt>
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

UPGRADING.md covers every release after 0.16.0. From an older version, follow
[MIGRATIONS.md](MIGRATIONS.md) up to 0.16.0 first. `CHANGELOG.md` has the full
notes; each section opens with an Upgrade block.

---

### Maintainers: cutting a release

```bash
pnpm changeset add        # record a patch/minor/major bump + notes
pnpm changeset:version    # apply bumps, regenerate CHANGELOG.md, record the release (scripts/upgrade/compile.mjs) and refresh docs/api/api-baseline.json
# commit + push to main → the Release workflow publishes to public npm
```

CI (`.github/workflows/release.yml`) automates steps 2–3 on merge to `main`.

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
