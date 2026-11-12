---
'@hirobius/design-system': patch
---

The README, which npm shows as the package page, now follows the Standard Readme layout: Background, Install, Usage, Docs, For AI agents, Contributing and License, in 76 lines. The long material (core set, adoption, theming dials, Figma sync, accessibility, explorations) moves to `docs/OVERVIEW.md`, and a front-door test fails when the README grows past 90 lines or names a typed package version (hds#1491).
