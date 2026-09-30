---
'@hirobius/design-system': patch
---

Box `sx` spacing props take the t-shirt scale by name (hds#206): `p: 'md'`, `gap: 'sm'`, also inside a responsive map, resolve to `var(--semantic-space-scale-*)`. Stack's `gap` and Box's `sx` now go through one resolver (`resolveSpacingValue` in `box-sx.ts`), so the two cannot drift. Stack renders the same gap for every value it accepts. Box's deprecated `'tight'`, `'normal'`, `'inset'` and `'spacious'` now emit `var(--semantic-space-scale-sm|md|lg|xl)` instead of `var(--semantic-space-layout-*)`: the same pixels at the default density, but under `data-density="compact"` they now tighten the way Stack's gap already did (16 to 12, 24 to 20, 32 to 24, 48 to 40px). Numbers on `sx` still resolve as before. No token is removed; MIGRATIONS.md lists the old names and their replacements. Inside HDS, `check-spacing-vocabulary` now blocks raw integers on `sx` spacing props at pre-commit.
