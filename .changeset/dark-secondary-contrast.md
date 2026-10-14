---
'@hirobius/design-system': patch
---

Dark `content.secondary` moves from neutral-400 to the new half-step primitive `neutral.350` (`#b4b4b4`), so secondary text clears WCAG AA (5.0:1) on `surface.sunken`, where it measured 4.11:1 (#730). It stays 1.9:1 below dark `content.primary`, so the text hierarchy holds. The contrast check now covers that pair, and a test pins the primary/secondary gap (#733).
