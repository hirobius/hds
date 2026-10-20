---
'@hirobius/design-system': minor
---

Light-mode pressed states now read as a step from hover (hds#769). `semantic.color.surface.pressed` is `neutral.200` (was `neutral.50`, 1.04:1 from hover) and the secondary button pressed fill uses it (was `surface.overlay`, 1.007:1 from hover). The secondary button no longer has a pressed border: the fill alone carries the press and the hover border stays, so `--component-button-secondary-border-pressed` is removed.
