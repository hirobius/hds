---
'@hirobius/design-system': patch
---

`Button`: the hard edge under secondary and the danger, success, warning and info tones now reads new `component.button.edge.*` tokens (fixed primitive steps, at least 1.5:1 against each fill) instead of a computed colour. The primary edge is still computed. `--hds-edge-<tone>` now aliases `--component-button-edge-<tone>`.
