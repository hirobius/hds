---
'@hirobius/design-system': patch
---

In dark mode a raised surface (Card, Surface, StatusTile, MetricTile) now reads as distinct from the page: `semantic.color.surface.raised` steps from neutral.950 to neutral.850 (1.06:1 to 1.21:1 against the page), and `surface.overlay` and `surface.sunken` step to neutral.800 so the page, raised, overlay order holds. Light mode is unchanged. `InlineCode` now binds its chip to the new `component.inlineCode.bg` token (an alias of `semantic.color.surface.overlay`) instead of borrowing `component.badge.bg`.
