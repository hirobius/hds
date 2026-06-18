# Consuming `@hirobius/design-system`

The design system ships as an ESM package published to **GitHub Packages**. This
guide is for apps that want to use the components, tokens, and helpers.

## 1. Authenticate to GitHub Packages (one time, per consumer)

GitHub Packages requires auth even for reads. Create a GitHub personal access
token with the `read:packages` scope, then add an `.npmrc` to the consuming
project (or your home dir):

```ini
@hirobius:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Export `GITHUB_TOKEN` in your shell / CI env (don't commit the token).

## 2. Install

```bash
pnpm add @hirobius/design-system
# peer dependencies (the consuming app provides these singletons):
pnpm add react react-dom react-router
```

The package also pulls in its own runtime deps (Radix, lucide-react, motion,
clsx, class-variance-authority, tailwind-merge) automatically.

## 3. Use

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

| Import | What |
| --- | --- |
| `@hirobius/design-system` | All components (primitives, patterns, templates) |
| `@hirobius/design-system/tokens.css` | Token CSS variables (import once at app root) |
| `@hirobius/design-system/tokens` | Token values as TS constants |
| `@hirobius/design-system/cn` | `cn()` class-merge helper |
| `@hirobius/design-system/manifest` | The HDS manifest JSON |
| `@hirobius/design-system/contexts` | Theme / language / tenant / font providers |

The package is **ESM-only**, so consume it with a modern bundler (Vite, Next.js,
Remix, Webpack 5+) or a Node ≥ 20 ESM runtime. Types are shipped from source, so
TypeScript consumers get full types with no extra config.

## 4. Receiving updates

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
# commit + push to main → the Release workflow publishes to GitHub Packages
```

CI (`.github/workflows/release.yml`) automates steps 2–3 on merge to `main`
using the built-in `GITHUB_TOKEN`.
