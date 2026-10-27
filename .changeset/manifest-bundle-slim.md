---
'@hirobius/design-system': minor
---

`@hirobius/design-system/manifest` is 4 kB gzip smaller (64.4 → 60.2 kB): the bundled entry leaves out `figmaLink` (the same URL as `figmaUrl`, now deprecated), `consumers` (HDS repo file paths) and `a11yRules[].testId` (HDS's own test ids). Read `figmaUrl` instead of `figmaLink` (hds#413).
