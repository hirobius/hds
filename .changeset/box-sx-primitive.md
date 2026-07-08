---
'@hirobius/design-system': minor
---

Add `Box` — a polymorphic layout primitive with a token-first `sx` engine (#92), a deliberate subset of MUI's `sx`: spacing shorthands (`m`/`p`/`gap` family) resolve off the HDS 4px scale and named layout steps, `color`/`bgcolor`/`borderColor`/`fill`/`stroke` resolve dotted token keys to semantic CSS vars, responsive `{ xs, sm, md, lg, xl }` values compile to `min-width` media queries, and `&`-prefixed keys compose nested selectors. Resolves to a deterministic, hash-cached, SSR-safe injected CSS class (`src/app/components/box-sx.ts`).
