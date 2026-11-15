---
'@hirobius/design-system': patch
---

`@hirobius/design-system/stats.json` gains two blocks, so other repos can cite them instead of typing them (hds#1385). `size.mainKb` is the gzip size of the main entry graph in kB. `tests` holds the count of automated tests: `unit`, `e2e`, `visual` and their `total`. Each block has `asOf`, the commit on main it was counted at. Both are refreshed on demand before a release, not on every build. No existing field changes.
