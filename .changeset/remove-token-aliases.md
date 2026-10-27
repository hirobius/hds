---
'@hirobius/design-system': minor
---

Breaking: remove `semantic.color.border.subdued` and the seven spacing aliases deprecated since hds#206 (`space.component.gap` and `.padding`; `space.layout.gutter`, `.tight`, `.normal`, `.inset` and `.spacious`), with their CSS variables, `hds.semantic.space` keys and Tailwind spacing keys (hds#625). Run `npx -p @hirobius/design-system@^0.33.0 hds-token-aliases` to move to `scale.xs`, `surface.padding`, `region.gutter`, `scale.sm`/`md`/`lg`/`xl` and `border.default`: the same pixels at both densities. Box `sx`'s deprecated `'tight'`…`'spacious'` now read the scale steps. `component.button.secondary.border.disabled` follows `border.default` (Dark neutral.600, was neutral.800).
