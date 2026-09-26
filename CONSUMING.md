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
clsx, class-variance-authority, tailwind-merge) automatically.

## 2. Use

```tsx
import { Button, Card, Dialog } from '@hirobius/design-system';
import '@hirobius/design-system/tokens.css'; // required — design tokens as CSS vars

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
| `@hirobius/design-system`            | All components (primitives, patterns, templates)                                                                                                                                                                                            |
| `@hirobius/design-system/tokens.css` | Token CSS variables (import once at app root)                                                                                                                                                                                               |
| `@hirobius/design-system/tokens`     | Token values as TS constants                                                                                                                                                                                                                |
| `@hirobius/design-system/cn`         | `cn()` class-merge helper                                                                                                                                                                                                                   |
| `@hirobius/design-system/manifest`   | The HDS manifest JSON                                                                                                                                                                                                                       |
| `@hirobius/design-system/contexts`   | Theme / language / tenant / font providers                                                                                                                                                                                                  |
| `@hirobius/design-system/brand`      | Palette → HDS-semantic overlay bridge (static / SSR / Astro; see [`docs/CONSUMING.md` §12](docs/CONSUMING.md#12-static-astro-sites--the-brand-overlay-bridge))                                                                              |
| `@hirobius/design-system/scroll`     | Opt-in scroll-motion primitives — `SmoothScroll` (Lenis), `useScrollProgress` (Motion). Requires the optional peer `lenis`. See [`docs/CONSUMING.md` §13](docs/CONSUMING.md#13-scroll-motion-the-scroll-subpath)                            |
| `@hirobius/design-system/patterns`   | The 22 `pattern`-tier components (nav shells, feeds, rails, pickers — see hds#254). Also still re-exported from the root for one minor (`@deprecated`, removed at the next major) — prefer this subpath in new code.                        |
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

## 2.5. Lint discipline (optional)

`@hirobius/eslint-plugin-hds` flags raw hex/px values in `style`, `className`,
and `Box` `sx` props so token discipline shows up in your editor, not just at
review time. See [`docs/CONSUMING.md` §11](docs/CONSUMING.md#11-lint-discipline--the-consumer-eslint-plugin)
and [`scripts/eslint-plugin-hds/README.md`](scripts/eslint-plugin-hds/README.md).

## 3. Receiving updates

Releases follow [semver](https://semver.org/) and are tracked in
`CHANGELOG.md`. To update:

```bash
pnpm update @hirobius/design-system   # latest within your version range
```

For a major (breaking) release, bump the version explicitly and review the
CHANGELOG entry. Token or export changes are released as majors.

---

### Maintainers: cutting a release

```bash
pnpm changeset add        # record a patch/minor/major bump + notes
pnpm changeset:version    # apply bumps + regenerate CHANGELOG.md
# commit + push to main → the Release workflow publishes to public npm
```

CI (`.github/workflows/release.yml`) automates steps 2–3 on merge to `main`.

Two repo secrets are required, and the workflow fails loudly naming either one
if it is missing or expired:

| Secret        | What it does                                                                                                                                            | If it lapses                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `NPM_TOKEN`   | Publishes to public npm. An npm "Automation" token for an account with publish rights on the `@hirobius` scope.                                         | The publish step fails.                                  |
| `RELEASE_PAT` | Authors the "Version Packages" PR and pushes tags. A **fine-grained** PAT scoped to `hirobius/hds` with Contents + Pull requests set to Read and write. | The run fails at the guard step, before anything builds. |

`RELEASE_PAT` exists because GitHub does not start workflow runs from events
created with `GITHUB_TOKEN`. With `GITHUB_TOKEN`, `ci.yml` never fires on the
release PR, so the required `Lean gate set` check cannot run and the PR is
unmergeable. A user-owned token is not subject to that guard, so the release PR
is tested like any other PR. Fine-grained tokens expire — when this one does,
the failure names the secret and the fix rather than silently reverting to the
deadlock.
