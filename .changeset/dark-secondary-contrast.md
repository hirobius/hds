---
'@hirobius/design-system': patch
---

Dark `content.secondary` moves from neutral-400 to neutral-300 so secondary text clears WCAG AA (7.0:1) on `surface.sunken`, where it measured 4.11:1 (#730). The contrast check now covers that pair.
