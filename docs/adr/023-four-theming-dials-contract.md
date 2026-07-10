# ADR-023: The Four Theming Dials Contract

**Status:** Accepted (2026-07-10)

## Context

`src/styles/theme.css` has, since before this ADR series existed, documented
a "public override contract" it calls the four theming **dials** — the
complete set of root-level hooks a consumer sets with **zero JavaScript** to
re-skin HDS:

```
• theme    → data-theme="dark"        (light = unset)
• density  → data-density="compact"   (comfortable = unset)
• brand    → data-brand="<slug>"      (+ data-tenant alias; base = unset)
• font     → --hds-font-family / --hds-font-family-mono
```

That comment cites **"ADR-020 §3"** as the seam's origin. ADR-020 is actually
**"Date/time components on react-day-picker v10 + date-fns"** — it has
nothing to do with theming dials. The citation is stale (most likely a
copy/paste of whatever ADR number was current when the comment was last
touched, never updated as the ADR series moved on). The theming seam itself
has been load-bearing and stable throughout — `ThemeContext`
(`src/app/context/hds-theme.tsx`), the `HdsThemeProvider` convenience, every
tenant overlay (`tenants/*/tokens.json`), and the density overrides (`theme.css`
~1040) all depend on exactly these four attribute/var names never changing —
but **no ADR has ever actually ratified it**. ISSUE-07 (#131) exists to close
that gap before ISSUE-04 (#128, per [[022-per-tenant-shape-density-axis]])
extends the `data-brand`/`data-density` combination surface, and before
ISSUE-01 (#125, per [[024-token-utility-bridge-scope]]) adds more consumer-
facing surface that must key off these same dials.

## Decision

Ratify the four dials, as already implemented, as **stable public API**:

| Dial    | Attribute / var                                                              | Values                               | Set by                                                                                                     |
| ------- | ---------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Theme   | `data-theme` on `<html>` (or scope root)                                     | `"dark"` \| unset (= light)          | `HdsThemeProvider` / `ThemeContext`, or manually                                                           |
| Density | `data-density` on `<html>` (or scope root)                                   | `"compact"` \| unset (= comfortable) | Consumer app or tenant config                                                                              |
| Brand   | `data-brand` on `<html>` (or scope root); `data-tenant` accepted as an alias | `"<slug>"` \| unset (= base palette) | Tenant deploy (`TENANT_SLUG` env → root attribute, per `docs/architecture/ADR-0001-multi-tenant-scope.md`) |
| Font    | `--hds-font-family`, `--hds-font-family-mono` (CSS custom properties)        | any font stack                       | Consumer override at any cascade scope                                                                     |

Three of the four (theme, density, brand) are **attribute-based**, selected
via CSS attribute selectors on a root or scope element, composing exactly the
way `[data-tenant]` was designed to compose with `[data-theme="dark"]` in
ADR-0001. The fourth (font) is **variable-based** since font stacks are
values, not modes, and CSS custom properties are the natural override
mechanism for a value a consumer might set at any scope, not just the root.

**These four attribute/variable names are the entire public theming surface.**
Any new dial (e.g. the shape/density overlay axis in
[[022-per-tenant-shape-density-axis]]) is expressed by **combining** the
existing attributes (`[data-brand][data-density]`), not by adding a fifth.
Renaming or removing any of the four is a breaking change requiring its own
superseding ADR.

`theme.css`'s inline citation is corrected from "ADR-020 §3" to this ADR.

## Rationale

- **Zero-JavaScript re-skin is the point.** A consumer (or a tenant deploy
  with no React runtime awareness) can restyle HDS by setting attributes on a
  root element. `HdsThemeProvider` is a convenience wrapper over this, not a
  requirement — the contract must hold with or without it.
- **Attribute selectors, not classes or `@layer`,** for theme/density/brand
  mirrors the cascade mechanism ADR-0001 already chose and justified for
  brand scoping (predictable specificity, universal baseline support,
  contributor-familiar DevTools debugging). Extending that same mechanism to
  theme and density (which predate ADR-0001) rather than introducing a
  second mechanism keeps the system to one cascade model.
- **CSS variables for font** because a font stack is a value a consumer may
  want to override at a nested scope (e.g. one page area in a different
  typeface), which attribute selectors don't support as naturally as a
  cascading custom property does.
- **Ratifying now, not retroactively inventing:** the seam already exists and
  is already depended upon (tenants, `ThemeContext`, density overrides). This
  ADR documents the decision that was implicitly made, closes the dangling
  citation, and gives future ADRs (022, 024, and beyond) a stable anchor to
  reference instead of re-deriving the contract or citing the wrong ADR
  number again.

## Consequences

- `src/styles/theme.css` header comment now cites ADR-023 instead of the
  incorrect "ADR-020 §3."
- Any future PR that renames `data-theme`/`data-density`/`data-brand`/
  `--hds-font-family(-mono)`, or drops the `data-tenant` alias, must ship a
  superseding ADR — it is a breaking change to public API, not a refactor.
- New tenant-facing overlay axes (shape/density combination, future dials)
  are documented as **combinations of these four attributes**, keeping the
  combinatorial surface linear and legible rather than growing a fifth
  independent dial per feature.
- Consumers and tenant `metadata.json`/onboarding docs can cite this ADR as
  the canonical reference for "what can I set on the root element to re-skin
  HDS," instead of reverse-engineering it from `theme.css` source.
