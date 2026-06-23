# Consuming `@hirobius/design-system`

How to install and use the Hirobius Design System (HDS) in another project. This
is the canonical consumption guide — point other teams here.

| | |
|---|---|
| **Package** | `@hirobius/design-system` |
| **Current version** | `0.5.0` |
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
export NODE_AUTH_TOKEN=<your-github-token>   # PAT/CI token with read:packages

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

## 6. Brand theming — re-skin to your own accent

HDS ships an electric-blue accent. To re-skin the **entire** system to your own
brand, override the **semantic accent contract** — a small set of CSS custom
properties — on `:root` (or any wrapper element), after importing `tokens.css`.
Every accent surface, border, link, and interactive state aliases back through
these vars, so overriding them re-skins the whole UI. **No DS-repo change
required, and no hand-authored ramp.**

### The override contract

```css
:root {
  /* interactive accent states */
  --semantic-accent-rest:    <brand>;
  --semantic-accent-hover:   <brand, ~8% darker>;
  --semantic-accent-pressed: <brand, ~16% darker>;
  --semantic-accent-subtle:  <brand, light tint>;
  --semantic-accent-content: <brand, readable as text on the page bg>;

  /* accent surfaces & borders */
  --semantic-color-surface-accent:       <brand>;
  --semantic-color-surface-accentSubtle: <brand, light tint>;
  --semantic-color-border-accent:        <brand>;
}
```

### Single-seed recipe (recommended)

A brand seed is a **hue + chroma**, *not* an absolute lightness — the **system**
owns role lightness. Project your hue onto the system's lightness targets so the
accent lands where the role expects it, and the existing foreground pairing just
works. Using OKLCH relative lightness (worked example: jade `#1fc28f`):

```css
:root {
  --brand-h: 165.2;   /* your brand hue    (jade) */
  --brand-c: 0.14;    /* your brand chroma        */

  /* accent lightness solved from the white-on-accent AA contract (system logic) */
  --semantic-accent-rest:    oklch(0.548 var(--brand-c) var(--brand-h)); /* ≈ #048560 */
  --semantic-accent-hover:   oklch(0.498 var(--brand-c) var(--brand-h));
  --semantic-accent-pressed: oklch(0.448 var(--brand-c) var(--brand-h));
  --semantic-color-surface-accent:       var(--semantic-accent-rest);
  --semantic-color-surface-accentSubtle: oklch(0.96 0.03 var(--brand-h));
  --semantic-color-border-accent:        var(--semantic-accent-rest);
  /* --semantic-color-content-onAccent: left untouched — stays system white */
}
```

**Generate it from one seed.** Rather than hand-author the block, run the helper —
it solves the accent lightness from the white-on-accent AA contract per hue (so
you never copy blue's lightness onto a green) and prints the override:

```bash
node scripts/tokens-sd/brand.mjs --hue 165.2 --chroma 0.14
# → AA-safe :root { --semantic-accent-* } block, white ink kept
```

> ⚠️ **Anti-pattern — never invert the foreground.** If `white`-on-accent fails
> contrast, the accent *lightness* is wrong for the role — **darken the seed**,
> do **not** flip `--semantic-color-content-onAccent` to dark ink. Inverting the
> foreground forks the system's contract per-consumer and silently desyncs from
> upstream accent/foreground changes. On-accent text stays system white.

**Why you can't copy blue's lightness for a green seed:** at equal OKLCH `L`,
hues differ in WCAG luminance (green ≫ blue, because luminance weights G `0.72`
vs B `0.07`). HDS blue holds white-on-accent at `L≈0.49`; jade has to darken to
`L≈0.548` for the same 4.5:1. Solve for the contrast ratio per hue rather than
reusing a step.

### Acceptance

Any seed (light *or* dark) should satisfy, in **both** light and dark themes:
on-accent text ≥ 4.5:1, accent-as-link ≥ 4.5:1, accent-as-border/ring ≥ 3.0:1 —
with **no consumer foreground overrides**.

## 7. Fonts & spacing overrides

Same model as brand theming — override a small, documented seam on `:root` (or a
wrapper) and the system follows.

### Fonts

Every type role resolves from three family primitives. Override them and all text
re-fonts (semantic roles alias these — e.g.
`--semantic-typography-h1-font-family → var(--primitive-typography-family-display)`):

```css
:root {
  --primitive-typography-family-primary: "Inter", system-ui, sans-serif;  /* body / UI   */
  --primitive-typography-family-display: "Fraunces", Georgia, serif;      /* headings    */
  --primitive-typography-family-mono:    "JetBrains Mono", monospace;     /* code / data */
}
```

You load the `@font-face` (or webfont link) yourself; HDS only references the
families. A `FontProvider` (from `…/contexts`) is also available. Note: swapping
families shifts metrics — eyeball heading rhythm and line-height after a change.

### Spacing rhythm

Three knobs:

- **Rhythm base unit** — set `--hds-space-unit` (default `4px`) on `:root` and the
  **macro layout rhythm** (section stacks, gutters, layout/grid gaps, section
  padding) rescales proportionally:

  ```css
  :root { --hds-space-unit: 5px; }   /* roomier: 80px stacks → 100px, etc. */
  ```

  The **micro component grid** (`--primitive-space-*`, e.g. button padding) stays
  fixed on 4px by design — so component internals and the Figma/native numeric
  token pipeline are unaffected.
- **Density** — set `data-density="compact"` on `<html>` to tighten the component
  spacing one step (the 4px grid is preserved).
- **Per-step override** — override individual `--primitive-space-N` steps if you
  must, but components assume that rhythm — change conservatively.

## 8. TypeScript & bundler requirements

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
