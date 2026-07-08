# Consuming `@hirobius/design-system`

How to install and use the Hirobius Design System (HDS) in another project. This
is the canonical consumption guide — point other teams here.

|                                 |                                                                            |
| ------------------------------- | -------------------------------------------------------------------------- |
| **Package**                     | `@hirobius/design-system`                                                  |
| **Min. version for this guide** | `0.7.0` (router optional, fonts bundled, scoped base styles)               |
| **Module format**               | ESM only (`"type": "module"`)                                              |
| **Registry**                    | **Public npm** (`https://registry.npmjs.org`) — no auth, no `.npmrc`       |
| **Peers**                       | `react` ^18.3 ‖ ^19 · `react-dom` (match) · `react-router` ^7 _(optional)_ |

> **What changed in 0.7.0** — three things make HDS drop-in for a plain app:
>
> 1. **`react-router` is now optional** — components route through an adapter and
>    fall back to plain anchors when no router is provided (§5).
> 2. **Fonts are bundled** — `tokens.css` embeds the typefaces; no font files to copy (§3).
> 3. **Base styles are scoped to `[data-hds]`** — add that attribute to your root
>    or section so HDS doesn't fight a host app's resets/fonts (§4, §6).

---

## 1–2. Install

HDS publishes to the **public npm registry**. There is no `.npmrc`, no token, and
no registry configuration — install it like any other package:

```bash
npm install @hirobius/design-system
npm install react react-dom            # required peers
```

(`pnpm add` / `yarn add` work identically.)

`react-router` is an **optional** peer. You only install it if you want HDS's
nav/link components to drive client-side navigation through your router — see
§5. With no router, links render as plain `<a>` and work everywhere.

## 3. Import a stylesheet (once, at the app root)

HDS ships **three** stylesheets. Pick one by how much you want HDS to own:

```ts
// RECOMMENDED for embedding in an existing app (e.g. MUI): tokens + component
// styles + utilities + embedded fonts, with NO global reset. Styles every HDS
// component and changes ZERO host-element styles.
import '@hirobius/design-system/styles.css';

// OR batteries-included: everything in styles.css PLUS a global reset
// (Tailwind preflight). Best for an HDS-first app you fully own.
import '@hirobius/design-system/tokens.css';

// OR vars-only: just the design-token custom properties, no components,
// no utilities, no reset. For theming another system from HDS tokens.
import '@hirobius/design-system/variables.css';
```

| Stylesheet          | Tokens | Components + utilities | Embedded fonts |     Global reset      |
| ------------------- | :----: | :--------------------: | :------------: | :-------------------: |
| **`styles.css`**    |   ✅   |           ✅           |       ✅       |        ❌ none        |
| **`tokens.css`**    |   ✅   |           ✅           |       ✅       | ⚠️ Tailwind preflight |
| **`variables.css`** |   ✅   |           ❌           |       ❌       |        ❌ none        |

All three:

- **Need no Tailwind config** in the consumer — utilities ship compiled.
- **Need no font files** — the woff2 are inlined (the file is correspondingly
  larger; woff2 is already compressed so gzip recovers most of it).

HDS's own base styles (type baseline, resets) are scoped to the `[data-hds]`
subtree (§4) in **all** bundles, so they never touch host elements. The only
difference is `tokens.css`'s **global** Tailwind preflight, which `styles.css`
omits — so `styles.css` is the safe default when HDS shares a page with another
framework's CSS (§6). Importing any component also pulls a stylesheet in as a
side-effect, but importing one explicitly at the entry point is the canonical,
order-stable setup.

## 4. Mark your HDS scope with `data-hds`

As of 0.7.0 the base styles (element resets, the body/heading type baseline, the
theme-change transition) are scoped to a **`[data-hds]`** subtree so they don't
collide with a host app's own resets or fonts. Add the attribute to the element
that should host HDS:

```html
<!-- whole app uses HDS -->
<html data-hds>
  …
</html>
```

```tsx
// or just a section of an otherwise non-HDS app
<div data-hds>
  <Button>Inside HDS scope</Button>
</div>
```

Without `data-hds`, components still get their own token-driven styling, but the
global type baseline and resets won't apply (text falls back to the host font).
Put `data-hds` as high as makes sense — on `<html>`/`<body>` for an
HDS-first app, or on a wrapper for a section. (Overlays that portal to
`document.body` — Dialog, Tooltip, Popover — sit outside a `<div>` scope; for
those, scope at `<html>`/`<body>` or add `data-hds` to your portal container.
See [ADR-016](adr/016-scoped-base-styles.md).)

## 5. Routing — optional, via the adapter seam

HDS components never import a router. Navigation comes from an injectable
adapter:

- **No router (default).** Do nothing. Links are real `<a href>`; in-app
  navigation falls back to `window.location`. Perfect for a plain Vite/React
  app or any page that doesn't need SPA nav.
- **react-router / Next.js / any router.** Wrap your app once and bridge your
  router into the adapter:

```tsx
import { HdsRouterProvider, type HdsRouterAdapter } from '@hirobius/design-system';
import { useNavigate, useLocation, Link } from 'react-router';

function HdsRouting({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const adapter: HdsRouterAdapter = {
    navigate: (href, opts) => navigate(href, opts),
    currentPath: pathname,
    LinkComponent: ({ to, children, ...rest }) => (
      <Link to={to} {...rest}>
        {children}
      </Link>
    ),
  };
  return <HdsRouterProvider adapter={adapter}>{children}</HdsRouterProvider>;
}
```

`useHdsRouter()` is also exported if you build your own components on the seam.

## 6. Coexisting with MUI / Emotion / another global CSS

If your app runs MUI `<CssBaseline>` + Emotion (or any opinionated global CSS),
**don't** apply HDS globally:

- Scope HDS to a section with `data-hds` (§4) rather than `<html>`, so HDS's
  base styles only affect that subtree.
- Don't expect HDS and `<CssBaseline>` to share `<body>` cleanly — pick one type
  system per surface. HDS's namespaced custom properties (`--semantic-*`,
  `--primitive-*`, `--hds-*`) won't collide with MUI's, but the two opinionated
  resets will fight if both target `body`.
- **Styled path (recommended for MUI/host embedding):** import
  `@hirobius/design-system/styles.css` instead of `tokens.css`. It ships the full
  component styling (tokens + utilities + fonts) but **no global reset** — HDS's
  own base is scoped to `[data-hds]`, so it styles every HDS component and
  **cannot** restyle your host's `*`, `body`, headings, `button`, `a`, or form
  controls. This is the clean way to run HDS next to `<CssBaseline>`: no reset
  fight, full component fidelity.
- **Vars-only path:** import `@hirobius/design-system/variables.css` for just the
  design-token custom properties — no components, no utilities, no reset. Use
  when you only want to theme another system (MUI palette, etc.) from HDS tokens
  and aren't rendering HDS components on that surface.
- **MUI theme preset:** `@hirobius/design-system/mui` maps HDS tokens to an MUI
  palette so MUI and HDS share one source of truth (status colors line up with
  `<Button tone>`). It imports no MUI code — the return type is structural:

  ```tsx
  import { createTheme, ThemeProvider } from '@mui/material';
  import { hdsMuiThemeOptions } from '@hirobius/design-system/mui';

  const theme = createTheme({ cssVariables: true, ...hdsMuiThemeOptions() });
  // render inside a `data-hds` scope (+ variables.css/styles.css) so the vars resolve
  ```

  Palette values are HDS token `var(--…)` references, so light/dark follow
  `[data-theme]` automatically. Requires MUI v6+ (`cssVariables: true`).

- **Leaf imports stay light:** importing a primitive (e.g. `Button`) does **not**
  pull `react-router`, `react-hook-form`, `zod`, or `@hookform/resolvers` into
  your bundle — those are optional peers used only by the router seam / the
  `/form` subpath, and aren't in the main bundle graph. A consumer with only
  `react`/`react-dom` installed builds cleanly (verified in `smoke:consumer`).
- **Only `tokens.css` carries a global reset.** If you specifically want HDS's
  batteries-included reset (Tailwind preflight, resets `margin`/`padding`/`border`
  globally), import `tokens.css`. Otherwise prefer `styles.css` — same components,
  no host reset.

## 7. Use it

```tsx
import { Button, Card, Badge } from '@hirobius/design-system';
import { cn } from '@hirobius/design-system/cn';
import { tokens } from '@hirobius/design-system/tokens';
import manifest from '@hirobius/design-system/manifest';

export function Example() {
  return (
    <div data-hds>
      <Card>
        <Badge tone="accent">New</Badge>
        <Button className={cn('mt-4')}>Get started</Button>
      </Card>
    </div>
  );
}
```

### Subpath exports

| Import                                  | What you get                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@hirobius/design-system`               | All public components + the router seam (`HdsRouterProvider`, `useHdsRouter`)                                |
| `@hirobius/design-system/styles.css`    | Components + utilities + tokens + fonts, NO global reset (host-safe; recommended for embedding)              |
| `@hirobius/design-system/tokens.css`    | The complete stylesheet — styles.css PLUS a global Tailwind-preflight reset                                  |
| `@hirobius/design-system/variables.css` | Design tokens as CSS custom properties ONLY — no reset/preflight (host-safe)                                 |
| `@hirobius/design-system/tokens`        | Design-token values as typed TS                                                                              |
| `@hirobius/design-system/cn`            | The `cn()` className-merge helper                                                                            |
| `@hirobius/design-system/manifest`      | Machine-readable component inventory (`hds-manifest.json`)                                                   |
| `@hirobius/design-system/contexts`      | React context providers, incl. the router seam (see below)                                                   |
| `@hirobius/design-system/form`          | Optional React Hook Form + Zod form adapter (see §8.5)                                                       |
| `@hirobius/design-system/mui`           | Optional Material UI theme preset — maps HDS tokens to an MUI palette (see §6)                               |
| `@hirobius/design-system/brand`         | Framework-free palette → HDS-semantic overlay bridge for static/SSR targets (see §12)                        |
| `@hirobius/design-system/scroll`        | Opt-in scroll-motion: `SmoothScroll` (Lenis) + `useScrollProgress` (Motion). Optional peer `lenis` (see §13) |

### Semantic feedback / status tokens

For status UI (Saved / Applied / Interviewing / Offer / Rejected, or any
success/warning/error/in-progress state), theme from HDS's feedback tokens
instead of hardcoding hex. Each is a CSS custom property that auto-switches
light/dark and is AA-verified for small text on both the page and card
(`raised`) surfaces (asserted by `scripts/check-contrast.mjs`):

| Intent      | Text color var                         | Tinted-surface var                        |
| ----------- | -------------------------------------- | ----------------------------------------- |
| success     | `--semantic-color-feedback-success`    | `--semantic-color-feedback-bg-success`    |
| warning     | `--semantic-color-feedback-warning`    | `--semantic-color-feedback-bg-warning`    |
| info        | `--semantic-color-feedback-info`       | `--semantic-color-feedback-bg-info`       |
| error       | `--semantic-color-feedback-error`      | `--semantic-color-feedback-bg-error`      |
| in-progress | `--semantic-color-feedback-inProgress` | `--semantic-color-feedback-bg-inProgress` |

```css
.status-offer {
  color: var(--semantic-color-feedback-success);
}
.status-pending {
  color: var(--semantic-color-feedback-inProgress);
}
```

The same values are available as typed TS via `@hirobius/design-system/tokens`
(`hds.color.feedback.*`), and the `Button` and `Badge` components expose them
directly through a `tone` prop so you rarely need the raw vars:

```tsx
<Button tone="danger">Delete</Button>        {/* AA in light + dark */}
<Badge tone="inProgress">Interviewing</Badge>
```

## 8. Optional providers — theming / i18n / multi-tenant / fonts

Only needed if you use those features. Mount them above your app:

```tsx
import {
  TenantProvider,
  LanguageProvider,
  ThemeProvider,
  FontProvider,
} from '@hirobius/design-system/contexts';

<TenantProvider>
  <LanguageProvider>
    <ThemeProvider>
      <FontProvider>{/* app */}</FontProvider>
    </ThemeProvider>
  </LanguageProvider>
</TenantProvider>;
```

`ThemeProvider` toggles light/dark by setting `data-theme` + `.dark` on
`<html>`. It does not set `data-hds` — add that yourself (§4).

## 8.5 Optional — typed, schema-validated forms (React Hook Form + Zod)

The main barrel is validation-agnostic: `FormField` takes a plain `error`
string, so you bring your own validation. If you want a batteries-included
layer, the `/form` subpath wires [React Hook Form](https://react-hook-form.com)
to [Zod](https://zod.dev). It's opt-in — `react-hook-form`, `zod`, and
`@hookform/resolvers` are **optional peer deps**, so they only land in your
bundle if you import this entry.

```bash
pnpm add react-hook-form zod @hookform/resolvers
```

```tsx
import { z } from 'zod';
import { useHdsForm, HdsForm, HdsFormField } from '@hirobius/design-system/form';
import { Button } from '@hirobius/design-system';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.string().min(1, 'Pick a role'),
});

function ApplyForm() {
  const form = useHdsForm(schema, { defaultValues: { email: '', role: '' } });
  return (
    <HdsForm form={form} onSubmit={(values) => save(values)}>
      <HdsFormField name="email" label="Email" description="We never share it.">
        {(props) => <input type="email" {...props} />}
      </HdsFormField>
      <HdsFormField name="role" label="Role">
        {(props) => (
          <select {...props}>
            <option value="">Choose…</option>
            <option value="ic">Individual contributor</option>
            <option value="lead">Lead</option>
          </select>
        )}
      </HdsFormField>
      <Button type="submit">Apply</Button>
    </HdsForm>
  );
}
```

- `useHdsForm(schema, options?)` — RHF's `useForm` with the Zod resolver and
  `onTouched` validation pre-wired; the schema's parsed type drives the field
  types so `onSubmit` gets a fully-typed, validated value object.
- `HdsForm` — wraps the form in RHF's `FormProvider`, routes submit through
  `handleSubmit`, and sets `noValidate` so Zod is the single source of
  validation (no native browser popups racing your schema).
- `HdsFormField` — a **render-prop**: spread the supplied props onto your
  control. It binds the control to RHF by `name` and shows the field's Zod
  error through the same label/error/aria markup as the core `FormField`. (It's
  a render-prop, not a cloned child, so RHF's callback ref attaches cleanly.)

**SSR / Astro / Next.js RSC:** this layer is client-only (RHF uses hooks +
refs). In Next's app router it carries a `'use client'` marker; in Astro, mount
the form inside a hydrated island (e.g. `client:load`).

## 9. TypeScript & bundler requirements

- **ESM-only.** Use a modern bundler (Vite, Next, Rspack, etc.). `require()` /
  CommonJS resolution will not work.
- **Types ship from source.** The package serves types directly from its `src/`
  TypeScript (no emitted `.d.ts`), so the consuming `tsconfig.json` should use
  `"moduleResolution": "bundler"` (or `"node16"`/`"nodenext"`).

## 10. Extending HDS — the consumption contract

HDS is **authoritative**. Consumers conform to its structure, extend in their
own namespace, and route gaps upstream — never the reverse. Follow these four
rules and token collisions between the package and your app become **structurally
impossible** — no shared registry, no coordination, no luck required.

The line is namespace ownership:

| DS-owned (never declare here)                                               | Consumer-owned (yours to define)              |
| --------------------------------------------------------------------------- | --------------------------------------------- |
| `--primitive-*` · `--semantic-*` · `--component-*` · `--role-*` · `--hds-*` | `--<prefix>-*` (pick one prefix for your app) |
| `data-hds` · `data-theme` · `data-tenant`                                   | your own `data-*` attributes                  |

Any release may add names inside DS-owned space; consumers may never declare
there. That single invariant is what makes overlap impossible by construction.

### C1 — The DS owns its namespaces

`--primitive-*`, `--semantic-*`, `--component-*`, `--role-*`, `--hds-*` and the
`data-hds` / `data-theme` / `data-tenant` attributes belong to the package.
**Never declare a token inside them**, and treat every release as free to add
names there. Declaring `--primitive-color-lilac-*` in your app, for example,
would silently override package tokens the day the DS ships its own — with no
error anywhere.

### C2 — Extend under your own prefix

App-local tokens, aliases, and component styles live in a **consumer namespace**
and may reference DS tokens freely:

```css
:root {
  --lb-lilac-500: #6f3fd4; /* app-owned value */
  --lb-cta-radius: var(--semantic-radius-action); /* references a DS token */
}
```

Pick one prefix for your app (`--lb-*` here, for lilac-bonds) and keep every
local declaration inside it.

### C3 — Brand through the tenant mechanism

Re-theming goes through the DS's own structure, not around it: author a **tenant
overlay** conforming to
[`hirobius.tenant-tokens.schema.json`](../hirobius.tenant-tokens.schema.json)
(**semantic tier only** — the primitive tier is off-limits, per rule R1), and
activate it with `data-tenant`. A local mirror of a not-yet-merged overlay is
fine as a stopgap, but mark it temporary and delete it once the overlay ships in
the package.

### C4 — Route gaps upstream, don't patch around them

A missing primitive, a token you need, or a fundamental flaw becomes an **issue
and PR against the DS** — not a permanent downstream fork. Every alias target
must exist in the base `hirobius.tokens.json` (rule R5), so a new brand ramp is
added upstream first, then the tenant overlay aliases it.

> **Optional (no DS obligation):** keep a downstream **drift-guard test** that
> pins the token paths your app consumes, so your CI fails when an upgrade moves
> something. The consumer adapts; it never gates a DS release.

**Reference implementation:** `hirobius/lilac-bonds` (the first external
consumer) follows all four — it consumes tokens via
`@hirobius/design-system/variables.css`, keeps every extension under `--lb-*`,
mirrors its brand through a tenant overlay, and pins consumed paths with a
CI-enforced drift guard.

## 11. Lint discipline — the consumer ESLint plugin

The design system's own token/layout discipline is enforced inside this repo
by `scripts/check-hardcoded-colors.mjs`, `scripts/check-hardcoded-spacing.mjs`,
and `scripts/check-layout-discipline.mjs` — internal scripts that only run
here. `@hirobius/eslint-plugin-hds` (`scripts/eslint-plugin-hds/`) ships the
same discipline as an installable ESLint plugin for consumer apps, flagging
raw hex/px values in `style`, `className`, and `Box` `sx` props before they
reach code review.

```bash
pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hirobius-design-system#path:/scripts/eslint-plugin-hds"
```

```js
// eslint.config.mjs
import hds from '@hirobius/eslint-plugin-hds';

export default [
  {
    files: ['**/*.{ts,tsx,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  ...hds.configs.recommended,
];
```

Four rules ship in `recommended`: `no-raw-hex` (error), `no-raw-px-spacing`
(error), `sx-token-first` (error — raw hex/px inside `Box` `sx`, where token
keys are mandatory), and `prefer-hds-layout-primitive` (warn — ad-hoc
`display: flex`/`grid` where Stack/Grid likely fits). Full rule docs, examples,
and the "why `scripts/eslint-plugin-hds/` and not a top-level workspace
package" packaging note live in
[`scripts/eslint-plugin-hds/README.md`](../scripts/eslint-plugin-hds/README.md).

## Troubleshooting

| Symptom                                            | Cause / fix                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ERR! 404` on install                          | Check the package name spelling; if pinning a version, confirm it's published on npm (`npm view @hirobius/design-system version`). Public npm needs no auth (see §1–2). |
| `ERR_REQUIRE_ESM` / `require() of ES Module`       | Consumer is CommonJS — switch to an ESM bundler (§9).                                                                                                                   |
| Components render unstyled / wrong font            | Import `@hirobius/design-system/styles.css` (or `tokens.css`) at the app root (§3) **and** add `data-hds` to your root or section (§4).                                 |
| Text uses the host font, not Satoshi               | Missing `data-hds` on an ancestor (§4).                                                                                                                                 |
| In-app links do a full page reload                 | Expected with no router. Inject your router via `<HdsRouterProvider>` for SPA nav (§5).                                                                                 |
| Host app's spacing/layout shifted after adding HDS | Tailwind preflight ships global this release (§6); scope HDS to a section and isolate where possible.                                                                   |
| Brand overlay has no effect on an Astro page       | Inject the overlay on an ancestor of the themed markup (usually `<html>`), and ensure `variables.css` is imported once (§12).                                           |

## 12. Static Astro sites + the brand overlay bridge

HDS is built for a React runtime, but its **tokens are just CSS custom
properties**, so a static Astro site can render HDS-consistent UI with **zero
React** — import the vars, set a few attributes, and let per-page markup read the
tokens through Tailwind utilities or plain CSS. Interactive pieces hydrate as
`client:*` islands only where you actually need them.

This is the path the `hirobius/clients` factory uses: one HDS token spine, many
brand skins, no parallel token system.

### 12.1 Wire the token spine once (in your base layout)

```astro
---
// src/layouts/Base.astro
import '@hirobius/design-system/variables.css'; // tokens only — no reset, host-safe
import { brandOverlayStyle } from '@hirobius/design-system/brand';
import { client } from '../client.config';

// Map the site's brand palette onto HDS semantics (see §12.2).
const style = brandOverlayStyle(client.palette);
---
<html lang="en" data-hds data-theme="light" style={style}>
  <head><slot name="head" /></head>
  <body><slot /></body>
</html>
```

- `data-hds` opts the subtree into HDS's base type/reset (§4).
- `data-theme="light|dark"` picks the mode; `data-brand="slug"` is available too
  if you prefer a checked-in overlay block over the inline style (§12.3).
- The inline `style` wins the cascade, so the brand always overrides defaults.

### 12.2 The brand bridge — palette → HDS semantics

`@hirobius/design-system/brand` is **framework-free** (no React, no Node), so it
runs in an Astro build or an edge function. Give it a small palette; it returns
the HDS semantic custom properties, deriving interactive accent states with CSS
`color-mix()`:

```ts
import {
  brandOverlayStyle,
  brandOverlayCss,
  brandOverlayVars,
} from '@hirobius/design-system/brand';

const palette = {
  primary: '#2f6f3e', // → --semantic-accent-rest + surface/border-accent
  onPrimary: '#ffffff', // → --semantic-color-content-onAccent
  bg: '#f7f8f3', // → --semantic-color-surface-page
  fg: '#1f2a1c', // → --semantic-color-content-primary
  muted: '#e7ecdd', // → --semantic-color-surface-raised
  accent: '#a7c957', // optional — kept brand-level (--brand-accent)
  radius: '8px', // optional — --semantic-radius-action
  fontHeading: '"Work Sans", sans-serif', // optional → display family
  fontBody: 'Inter, sans-serif', // optional → primary family
};

brandOverlayStyle(palette); // "…k:v;k:v" for <html style>
brandOverlayCss('[data-brand="acme"]', palette); // a scoped CSS rule block
brandOverlayVars(palette); // the raw { --var: value } record
```

Only the accent ramp, page/content colours, and (when given) radius + fonts are
overridden; everything else inherits HDS defaults, so a partial palette still
yields a coherent theme. `color-mix()` is Baseline-supported (evergreen engines
since 2023).

### 12.3 Multi-brand: `data-brand` blocks

For several brands on one deploy (per-niche reskins), emit a `data-brand` block
per brand with `brandOverlayCss` into a global stylesheet and switch by
attribute — no inline style, no rebuild:

```ts
// build a static stylesheet from your brand registry
const css = brands.map((b) => brandOverlayCss(`[data-brand="${b.slug}"]`, b.palette)).join('\n');
```

```astro
<html data-hds data-brand={Astro.url.searchParams.get('brand') ?? 'default'}>
```

### 12.4 Hydrate only what's interactive

Static primitives (badge, card, alert, divider, tag, the layout primitives, and
`Box`/`sx`) render from tokens with no JS — either as React (unhydrated SSR
output) or, for a page with **zero React at all**, via the semantic classes in
`@hirobius/design-system/static.css` (§14). Reach for a React island **only**
for genuinely interactive components:

```astro
---
import { ContactForm } from '@hirobius/design-system';
---
<ContactForm client:visible />
```

Import `@hirobius/design-system/styles.css` once (alongside `variables.css`, or
instead of it) when you hydrate components that need HDS's compiled component
CSS. For a purely static page, `variables.css` + your own Tailwind utilities is
enough.

## 13. Scroll motion — the `/scroll` subpath

Opt-in scroll-motion primitives. `lenis` is an **optional peer dependency** — install it only if you use `SmoothScroll`:

```bash
pnpm add lenis   # required only for SmoothScroll; useScrollProgress needs nothing extra
```

**Layering (cheapest first):**

1. **CSS scroll-driven animation** (`animation-timeline: view()/scroll()` + `position: sticky`) — reveal / pin / parallax / scale with **zero JS**. Prefer this.
2. **`useScrollProgress(ref)`** — a Motion-based `0→1` MotionValue for effects you need in React (canvas/WebGL, cross-element choreography). No new dependency; works with or without `SmoothScroll`.
3. **`SmoothScroll`** — Lenis momentum ("inertia") scrolling, the one thing CSS/Motion can't do. Wrap the app/site root once. It **skips Lenis entirely under `prefers-reduced-motion`** (native scroll) and is SSR-safe.

```tsx
import { SmoothScroll, useScrollProgress } from '@hirobius/design-system/scroll';
import { motion, useTransform } from 'motion/react';
import { useRef } from 'react';

function Root() {
  return (
    <SmoothScroll>
      {' '}
      {/* momentum scroll; reduced-motion aware */}
      <Hero />
    </SmoothScroll>
  );
}

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref); // 0 → 1 through the viewport
  const scale = useTransform(progress, [0, 1], [0.4, 1]);
  return <motion.div ref={ref} style={{ scale }} />;
}
```

`SmoothScroll` drives the real scroll position, so CSS `animation-timeline` and `useScrollProgress` keep working underneath it unchanged. See `docs/adr/021-animation-engine-motion-core-gsap-downstream.md` for why Lenis is opt-in and GSAP is out.

## 14. CSS-only static primitives — `/static.css` (zero React)

`Badge`, `Card`, `Alert`, `Divider`, and `Tag` are React components internally,
but their visual surface is just tokens. `@hirobius/design-system/static.css`
ships that same surface as plain, semantic `.hds-*` classes so a static `.astro`
page — or any HTML with no React runtime at all — can use them directly. This
is the layer §12.4 points to for "static primitives, no JS."

```astro
---
// src/layouts/Base.astro
import '@hirobius/design-system/variables.css'; // token spine (§12.1)
import '@hirobius/design-system/static.css'; // the 5 static-primitive classes
---
<html lang="en" data-theme="light">
  ...
</html>
```

Every declaration resolves to an HDS semantic/component custom property — no
raw hex/px — and every selector is `.hds-*` scoped, so importing this file
cannot restyle anything outside the classes it defines (no reset, no
preflight, no bare-element rules). `data-theme="light" | "dark"` on an
ancestor re-themes all of it, same as the React components.

```html
<!-- Badge — tone is the only styling axis -->
<span class="hds-badge">Neutral</span>
<span class="hds-badge hds-badge--danger">Failed</span>
<span class="hds-badge hds-badge--success">Shipped</span>

<!-- Card — root + header/title/description/body/footer parts -->
<div class="hds-card hds-card--bordered">
  <div class="hds-card__header">
    <div class="hds-card__header-meta">
      <span class="hds-badge hds-badge--info">In progress</span>
    </div>
    <h3 class="hds-card__title">Discovery phase</h3>
    <p class="hds-card__description">Stakeholder interviews and audit prep.</p>
  </div>
  <div class="hds-card__body">
    <p>Body copy goes here.</p>
  </div>
  <div class="hds-card__footer">
    <span class="hds-card__description">Updated 2 days ago</span>
  </div>
</div>

<!-- Alert — tone drives the background; icon is caller-supplied (currentColor) -->
<div class="hds-alert hds-alert--warning" role="alert">
  <svg class="hds-alert__icon" width="16" height="16" aria-hidden="true"><!-- glyph --></svg>
  <span class="hds-alert__body">Your session expires in 5 minutes.</span>
</div>

<!-- Divider -->
<hr class="hds-divider" />
<hr class="hds-divider hds-divider--strong" />

<!-- Tag — a static (non-toggling) chip; add your own click handling if needed -->
<button type="button" class="hds-tag" aria-pressed="false">
  <span class="hds-tag__pill">Design</span>
</button>
<button type="button" class="hds-tag hds-tag--active" aria-pressed="true">
  <span class="hds-tag__pill">Engineering</span>
</button>
```

Modifier reference:

| Primitive | Base class  | Modifiers                                                                                        |
| --------- | ----------- | -------------------------------------------------------------------------------------------------- |
| Badge     | `hds-badge` | `--info` `--success` `--danger` `--warning` `--in-progress` (unmodified = neutral)                 |
| Card      | `hds-card`  | `--bordered` `--accent` `--tone-danger` `--tone-success` `--tone-warning` `--tone-info`             |
| Alert     | `hds-alert` | `--success` `--danger` `--warning` `--info` (unmodified = info) · `--has-title` for a two-line body |
| Divider   | `hds-divider` | `--vertical` `--strong`                                                                          |
| Tag       | `hds-tag` (+ inner `hds-tag__pill`) | `--active` for the selected state                                          |

These classes are a hand-authored analog of the React components, not a
compiled export of them — behavior (focus rings, `aria-pressed` toggling,
motion) still needs your own JS if you reach for it. For anything beyond
these 5 primitives, or once a page needs real interactivity, hydrate a React
island instead (§12.4).
