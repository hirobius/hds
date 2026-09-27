---
'@hirobius/design-system': patch
---

hds#206 remaining work: codemod hds's own internal spacing-token references
(CSS `var(--semantic-space-{layout,component}-*)` reads and
`hds.semantic.space.{layout,component}.*` / bare `semantic.space.*` dotted
paths in `src/`) off the deprecated aliases and onto the canonical
`semantic.space.scale.{xs,sm,md,lg,xl}` t-shirt scale added in #297. Pure
rename — every rewritten reference resolves to the identical px value, no
visual or behavioral change. Added `hds.semantic.space.scale.*` to the token
bridge (`tokens.ts`) so the canonical accessor exists in JS, not just CSS.

Script: `scripts/codemod-spacing-vocabulary.mjs` (idempotent, `--check` for a
dry run, unit-tested in `scripts/__tests__/codemod-spacing-vocabulary.test.mjs`).

Out of scope for this slice (unchanged): the public `gap`/`padding` prop
VALUES components accept (`gap="tight"`, `padding="component"`, etc.) and
`box-sx.ts`'s own resolver (it builds the deprecated var name dynamically,
not as a literal — unifying it with Stack's resolver is hds#206 item #4).
The deprecated aliases in `hirobius.tokens.json` are kept live and the
`check-spacing-vocabulary` gate stays in warn mode, per Adrian's 2026-09-26
decision.
