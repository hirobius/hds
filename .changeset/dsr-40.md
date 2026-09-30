---
'@hirobius/design-system': patch
---

Box `sx` spacing props take the t-shirt scale by name (hds#206): `p: 'md'`, `gap: 'sm'`, also inside a responsive map, resolve to `var(--semantic-space-scale-*)`. Stack's `gap` and Box's `sx` now go through one resolver (`resolveSpacingValue` in `box-sx.ts`), so the two cannot drift. Stack renders the same gap for every value it accepts. Box's deprecated `'tight'`, `'normal'`, `'inset'` and `'spacious'` now emit `var(--semantic-space-scale-sm|md|lg|xl)` instead of `var(--semantic-space-layout-*)`: the same pixels at the default density, but under `data-density="compact"` they now tighten the way Stack's gap already did (16 to 12, 24 to 20, 32 to 24, 48 to 40px). Numbers on `sx` still resolve as before. No token is removed; MIGRATIONS.md lists the old names and their replacements. Inside HDS, `check-spacing-vocabulary` now blocks raw integers on `sx` spacing props at pre-commit.

Token descriptions only, no value changes: 15 `$description`s in `hirobius.tokens.json` (8 of them the hds#206 spacing ones) are trimmed to the 20-word limit that `check-token-descriptions --no-missing` enforces in `pnpm check`, which now gets past that step.

`hds.density.*` is deprecated (`@deprecated`, `@removeIn 1.0.0`). It was a second t-shirt vocabulary whose names mean different pixels (`density.sm` is 8px, `scale.sm` is 16px). Use `hds.semantic.space.scale.*`, one name down: `density.sm|md|lg|xl|xl2` compute the same pixels as `scale.xs|sm|md|lg|xl` at both densities. `density.xs`, `xl3` and `xl4` have no scale step. It still works; MIGRATIONS.md has the table.

For untyped callers only: a number on Stack's `gap` now resolves as a count of 4px units, the way Box `sx` does (it used to pass through as raw px), and `'sm'` to `'xl'` resolve to the scale. Stack's types allow neither.
