---
'@hirobius/design-system': patch
---

`public/hds-stats.json` gains `figmaSync: { synced, total, source }`: the components whose code, docs and Figma agree, of all that `docs/sync-map.json` maps (hds#1385). Like every other value in the file it is computed from the repo and checked before tests, so a consumer can cite it instead of typing a number.
