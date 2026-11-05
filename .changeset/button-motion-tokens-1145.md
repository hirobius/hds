---
'@hirobius/design-system': patch
---

The `hds.motion.*` records move to an internal module, so `useHdsMotion` (and Button) no longer import the full token bridge. No public API change: `hds.motion` from `@hirobius/design-system/tokens` is the same object (hds#1145).
