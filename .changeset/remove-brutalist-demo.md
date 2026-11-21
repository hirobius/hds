---
'@hirobius/design-system': minor
---

Remove the `brutalist-demo` direction. `[data-brand="brutalist-demo"]` no longer styles anything, and `directions/brutalist-demo/` is gone. `soft-demo` is the shipped example of a direction. `TenantSlug` no longer lists `brutalist-demo` (any string still type-checks). A page that set `brand="brutalist-demo"` falls back to the default look: 8px action radius, 24px surface padding.
