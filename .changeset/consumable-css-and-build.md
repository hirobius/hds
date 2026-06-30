---
'@hirobius/design-system': minor
---

Host-safe CSS + verified consumer build (packaging task C-partial / D / E).

- **New `@hirobius/design-system/variables.css`** — design tokens as CSS custom
  properties ONLY (no Tailwind preflight, no `@layer base` reset, no utilities).
  Importing it cannot restyle a host app's elements, so it's the safe path for
  embedding HDS tokens inside MUI/another design system. The full `tokens.css`
  is unchanged (greenfield).
- **`sideEffects`** tightened to `["**/*.css"]` (source no longer ships), so
  bundlers tree-shake unused JS exports while keeping CSS side-effectful.
- **`smoke:consumer` now also runs a consumer `vite build`** of a `Button`-only
  app with NONE of `react-router`/`react-hook-form`/`zod`/`@hookform/resolvers`
  installed — proving leaf imports don't drag in the router/form stack (they're
  optional peers, absent from the main bundle graph). Plus the consumer
  `tsc --noEmit` + `publint` gates added previously.
- **docs/CONSUMING.md** documents the vars-only path for MUI coexistence and the
  verified "leaf imports stay light" guarantee.

Note: scoping the full stylesheet's global Tailwind **preflight** reset is a
tracked follow-up (needs visual-regression verification); `variables.css` is the
host-safe path in the meantime.
