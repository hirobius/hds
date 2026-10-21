---
'@hirobius/design-system': minor
---

feat: compact density for apps. 0.29 loosened the default rhythm for sites; dense apps now opt back into a tighter one with `data-density="compact"` on `<html>` or any ancestor. The compact values are a `Compact` mode in `hirobius.tokens.json`, emitted by the token build into a `[data-density="compact"]` block in `tokens.css` (it was hand-written in `theme.css`): `semantic.space.scale` sm/md/lg/xl 12/16/24/32px (was 16/24/32/48px under compact), the deprecated `layout.*` steps 12/16/24/32px, `section.stack` 48px, and type body 15 · ui 14 · caption 13 · title 24px (display stays 56px). Adds `semantic.space.scale.2xs` (4px in both densities) and the `compactBody` / `compactCaption` type primitives. Figma gets the same values as Hirobius/Density variables. The docs display settings gain a Density switch.
