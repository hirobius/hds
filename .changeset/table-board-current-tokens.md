---
'@hirobius/design-system': patch
---

Table dividers and borders now read `border.default` instead of the deprecated `border.subdued` (same in Light; two steps lighter than before in Dark: neutral.600 vs 800). Board columns gap now reads `scale.lg` instead of the deprecated `layout.inset` (32px in compact density, not 40px). A new test fails if `src/` reads any token marked `$deprecated`.
