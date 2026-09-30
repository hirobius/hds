---
'@hirobius/design-system': minor
---

Box `sx` spacing props take the t-shirt scale by name (hds#206): `p: 'md'`, `gap: 'sm'`, also inside a responsive map, resolve to `var(--semantic-space-scale-*)`. Before, those names passed through as invalid CSS and rendered no spacing. Nothing else Box or Stack renders changes: every other `sx` spacing value and every Stack `gap` value computes the same pixels as before, in every tenant, density and breakpoint (a Chromium test locks this against the previous commit). Box's deprecated `'tight'`, `'normal'`, `'inset'` and `'spacious'` still read the fixed `--semantic-space-layout-*` vars, and Stack's same four names still read the scale steps, which compact density tightens; both are removed in 1.0. Stack's `gap` and Box's `sx` now share one resolver (`resolveSpacingValue` in `box-sx.ts`), each with its own vocabulary. No token is removed; MIGRATIONS.md lists the old names, their replacements, and what the swap does under `data-density="compact"`. Inside HDS, `check-spacing-vocabulary` now blocks raw integers on `sx` spacing props at pre-commit.

Token descriptions only, no value changes: 15 `$description`s in `hirobius.tokens.json` (8 of them the hds#206 spacing ones) are trimmed to the 20-word limit that `check-token-descriptions --no-missing` enforces in `pnpm check`.

`hds.density.*` is deprecated (`@deprecated`, `@removeIn 1.0.0`). It was a second t-shirt vocabulary whose names mean different pixels (`density.sm` is 8px, `scale.sm` is 16px). Use `hds.semantic.space.scale.*`, one name down: `density.sm|md|lg|xl|xl2` compute the same pixels as `scale.xs|sm|md|lg|xl` at both densities. `density.xs`, `xl3` and `xl4` have no scale step. It still works; MIGRATIONS.md has the table.
