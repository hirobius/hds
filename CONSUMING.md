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

| Import                               | What                                             |
| ------------------------------------ | ------------------------------------------------ |
| `@hirobius/design-system`            | All components (primitives, patterns, templates) |
| `@hirobius/design-system/tokens.css` | Token CSS variables (import once at app root)    |
| `@hirobius/design-system/tokens`     | Token values as TS constants                     |
| `@hirobius/design-system/cn`         | `cn()` class-merge helper                        |
| `@hirobius/design-system/manifest`   | The HDS manifest JSON                            |
| `@hirobius/design-system/contexts`   | Theme / language / tenant / font providers       |

The package is **ESM-only**, so consume it with a modern bundler (Vite, Next.js,
Remix, Webpack 5+) or a Node ≥ 20 ESM runtime. Built `.d.ts` declarations ship in
`dist/types`, so TypeScript consumers get full types with no extra config.

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
Publishing uses the `NPM_TOKEN` repo secret (an npm "Automation" token for an
account with publish rights on the `@hirobius` scope).
