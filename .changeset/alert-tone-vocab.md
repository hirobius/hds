---
'@hirobius/design-system': minor
---

Alert: unify the feedback prop with Badge/Card/Callout. `variant` is renamed to
`tone`, and the destructive value `"error"` is renamed to `"danger"` (the
feedback red is `danger` everywhere now). The token CSS variables are unchanged.

Migration: `pnpm codemod -t codemods/alert-tone-to-danger.cjs <path>`
