---
'@hirobius/design-system': patch
---

Components read their tokens from a small `component-tokens` module instead of the whole `hds` bridge, so a components-only import of the root ships about 1.8 kB less (gzipped). No change to markup, styles or the public API (hds#1519).
