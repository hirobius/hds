---
'@hirobius/design-system': patch
---

The component manifest (`hds-manifest.json`) now matches the live Figma library (hds#1557). 19 components that gained a Code Connect template declare their variant axes in `variantAxes` (for example `Text`: `variant`, `tone`; `Kbd`: `size`), and three Figma property names the library does not have are gone from `figmaPropertyMapping` (Button `Tone`, Card `Gap`, Dialog `Modal`). No component, prop or token changes.
