---
'@hirobius/design-system': patch
---

Button: the secondary hover stays grey under the cobalt accent. `data-accent="cobalt"` no longer re-maps `component.button.secondary.bg.hover` to the navy `surface.accentSubtle`; the hover is the next grey surface step (`surface.softHover`) in light and dark, as the Figma Hover variant draws it. The edge does not change on hover.
