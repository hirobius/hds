---
'@hirobius/design-system': patch
---

New tokens for values code already used without one: `semantic.borderWidth.icon.{thin,light,regular,bold}` (1, 1.5, 2, 2.5, via `primitive.strokeWidth.*`), which `Icon`'s `weight` prop now reads, and `primitive.size.width.512` (the default Dialog max width). DialogHeader's 6px gap now uses `primitive.space.px6`. No visual change (hds#801).
