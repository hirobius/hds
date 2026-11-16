---
'@hirobius/design-system': patch
---

`@hirobius/design-system/stats.json` carries two more generated fields: `figmaParity` (the Figma and code parity score, `percent`, `passed`, `total`, and the day of the Figma read) and `codeConnect` (the number of generated Code Connect templates). Both are computed from the repo and rewritten by every parity run, never typed. Nothing else in the package changes.
