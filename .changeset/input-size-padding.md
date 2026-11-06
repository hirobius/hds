---
'@hirobius/design-system': patch
---

Input reads its horizontal padding from component tokens at every size (hds#1323): `component.input.paddingX` (12px) is now documented as the medium (default) value, and the new `component.input.size.sm.paddingX` (8px) and `component.input.size.lg.paddingX` (16px) cover small and large. The rendered padding is unchanged; Figma can bind each size to its own variable.
