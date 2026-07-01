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

| Import                                  | What you get                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `@hirobius/design-system`               | All public components + the router seam (`HdsRouterProvider`, `useHdsRouter`)                   |
| `@hirobius/design-system/styles.css`    | Components + utilities + tokens + fonts, NO global reset (host-safe; recommended for embedding) |
| `@hirobius/design-system/tokens.css`    | The complete stylesheet — styles.css PLUS a global Tailwind-preflight reset                     |
| `@hirobius/design-system/variables.css` | Design tokens as CSS custom properties ONLY — no reset/preflight (host-safe)                    |
| `@hirobius/design-system/tokens`        | Design-token values as typed TS                                                                 |
| `@hirobius/design-system/cn`            | The `cn()` className-merge helper                                                               |
| `@hirobius/design-system/manifest`      | Machine-readable component inventory (`hds-manifest.json`)                                      |
| `@hirobius/design-system/contexts`      | React context providers, incl. the router seam (see below)                                      |
| `@hirobius/design-system/form`          | Optional React Hook Form + Zod form adapter (see §8.5)                                          |
| `@hirobius/design-system/mui`           | Optional Material UI theme preset — maps HDS tokens to an MUI palette (see §6)                  |

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

## Troubleshooting

| Symptom                                            | Cause / fix                                                                                                                                                             |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ERR! 404` on install                          | Check the package name spelling; if pinning a version, confirm it's published on npm (`npm view @hirobius/design-system version`). Public npm needs no auth (see §1–2). |
| `ERR_REQUIRE_ESM` / `require() of ES Module`       | Consumer is CommonJS — switch to an ESM bundler (§9).                                                                                                                   |
| Components render unstyled / wrong font            | Import `@hirobius/design-system/styles.css` (or `tokens.css`) at the app root (§3) **and** add `data-hds` to your root or section (§4).                                 |
| Text uses the host font, not Satoshi               | Missing `data-hds` on an ancestor (§4).                                                                                                                                 |
| In-app links do a full page reload                 | Expected with no router. Inject your router via `<HdsRouterProvider>` for SPA nav (§5).                                                                                 |
| Host app's spacing/layout shifted after adding HDS | Tailwind preflight ships global this release (§6); scope HDS to a section and isolate where possible.                                                                   |
