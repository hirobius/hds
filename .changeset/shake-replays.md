---
'@hirobius/design-system': patch
---

The `shake` motion recipe plays again on every keyed remount (hds#1397). It started from `initial: false`, so a field keyed on its error took the last keyframe as its first frame and never shook. It now starts from `{ x: 0 }`.
