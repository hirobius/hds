---
'@hirobius/design-system': minor
---

hds#206 slice 3: the two runtime-overridden spacing tokens get canonical names,
with their overrides expressed as t-shirt scale steps. No computed value changes.

- New `semantic.space.surface.padding` (`--semantic-space-surface-padding`,
  `hds.semantic.space.surface.padding`), default `scale.md` (24px). Tenants
  override it per brand and density (brutalist-demo: `scale.sm`, `scale.xs`
  under `[data-density="compact"]`).
- New `semantic.space.region.gutter` (`--semantic-space-region-gutter`,
  `hds.semantic.space.region.gutter`), default `scale.md`. `theme.css` sets it
  to `scale.lg` (32px), and `scale.sm` (16px) below 640px.
- `semantic.space.component.padding` and `semantic.space.layout.gutter` stay
  as `$deprecated` aliases of the new names. Each tenant block redeclares the
  deprecated alias next to its override, so consumers still reading the old
  var inside a `[data-brand]` subtree keep the tenant value.
- `$deprecated` (DTCG) now marks all seven hds#206 aliases in
  `hirobius.tokens.json`.
- hds's own `src/` now reads the new names, rewritten by
  `scripts/codemod-spacing-vocabulary.mjs`.
