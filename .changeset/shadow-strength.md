---
'@hirobius/design-system': patch
---

Shadows read in dark mode (hds#751): new `primitive.shadow.strength` (`--primitive-shadow-strength`, 1 in light, 3 in dark) scales the opacity of `semantic.shadow.subtle|floating|overlay`, which were nearly invisible on dark surfaces.
