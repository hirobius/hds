# Consuming `@hirobius/design-system`

How to install and use the Hirobius Design System (HDS) in another project. This
is the canonical consumption guide — point other teams here.

| | |
|---|---|
| **Package** | `@hirobius/design-system` |
| **Current version** | `0.3.0` |
| **Module format** | ESM only (`"type": "module"`) |
| **Registry** | **GitHub Packages** (`https://npm.pkg.github.com`) — *not* public npm |
| **Peers** | `react` ^18.3 ‖ ^19 · `react-dom` (match) · `react-router` ^7 |

---

## 1. Point the `@hirobius` scope at GitHub Packages & authenticate

The package lives on GitHub Packages, so the consuming project must route the
`@hirobius` scope there and authenticate — otherwise `npm install` will 404
(it looks on public npm, where the package doesn't exist).

Add an `.npmrc` at the **root of the consuming project**:

```ini
@hirobius:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then provide a GitHub token (classic PAT or CI token) with the **`read:packages`**
scope and access to the `hirobius` org. Reference it via env var — never commit a
literal token:

```bash
# local dev
export NODE_AUTH_TOKEN=ghp_your_token_here

# GitHub Actions: the built-in GITHUB_TOKEN works if the workflow has
#   permissions: { packages: read }
#   env: { NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
```

> Docs: [Installing a package from GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#installing-a-package).

## 2. Install

```bash
npm install @hirobius/design-system
npm install react react-dom react-router      # peer dependencies
```

(`pnpm add` / `yarn add` work identically and read the same `.npmrc`.)

`react-router` ^7 is a **hard peer**: nav/link components import from it, and the
consuming app must mount a `<Router>` (e.g. `BrowserRouter`) somewhere above any
HDS component that links — even apps that don't otherwise route.

## 3. Import the base stylesheet (once, at the app root)

Base styles (tokens + theme + utilities) auto-load as a side-effect of importing
any component, but importing the token stylesheet explicitly at your entry point
is the canonical, order-stable setup:

```ts
import '@hirobius/design-system/tokens.css';
```

## 4. Use it

```tsx
import { Button, Card, Badge } from '@hirobius/design-system';
import { cn } from '@hirobius/design-system/cn';
import { tokens } from '@hirobius/design-system/tokens';
import manifest from '@hirobius/design-system/manifest';

export function Example() {
  return (
    <Card>
      <Badge tone="accent">New</Badge>
      <Button className={cn('mt-4')}>Get started</Button>
    </Card>
  );
}
```

### Subpath exports

| Import | What you get |
|---|---|
| `@hirobius/design-system` | All public components (primitives, patterns, templates) |
| `@hirobius/design-system/tokens.css` | The base stylesheet (CSS custom properties + theme) |
| `@hirobius/design-system/tokens` | Design-token values as typed TS |
| `@hirobius/design-system/cn` | The `cn()` className-merge helper |
| `@hirobius/design-system/manifest` | Machine-readable component inventory (`hds-manifest.json`) |
| `@hirobius/design-system/contexts` | React context providers (see below) |

## 5. Optional providers — theming / i18n / multi-tenant / fonts

Only needed if you use those features. Mount them above your app:

```tsx
import {
  TenantProvider, LanguageProvider, ThemeProvider, FontProvider,
} from '@hirobius/design-system/contexts';

<TenantProvider>
  <LanguageProvider>
    <ThemeProvider>
      <FontProvider>{/* app */}</FontProvider>
    </ThemeProvider>
  </LanguageProvider>
</TenantProvider>;
```

## 6. TypeScript & bundler requirements

- **ESM-only.** Use a modern bundler (Vite, Next, Rspack, etc.). `require()` /
  CommonJS resolution will not work.
- **Types ship from source.** The package serves types directly from its `src/`
  TypeScript (no emitted `.d.ts`), so the consuming `tsconfig.json` should use
  `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm ERR! 404` on install | `.npmrc` scope/registry not set, or token missing `read:packages` (see §1). |
| `ERR_REQUIRE_ESM` / `require() of ES Module` | Consumer is CommonJS — switch to an ESM bundler (§6). |
| `useNavigate()/<Link> … outside a <Router>` | Mount a Router above HDS components, and install `react-router` ^7 (§2). |
| Components render unstyled | Import `@hirobius/design-system/tokens.css` at the app root (§3). |
