---
'@hirobius/design-system': patch
---

Pagination `variant="compact"`: Previous and Next are outlined (a `border.default` edge), and a disabled end keeps the outline at reduced emphasis (transparent, the same `border.default` edge, content-disabled icon) instead of the grey muted fill, so it reads as "not here" without looking like a different control (hds#886).
