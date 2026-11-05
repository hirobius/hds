---
'@hirobius/design-system': patch
---

Button: `variant="link"` draws its keyboard focus ring 4px (`space.scale.2xs`) past the label on each side, on the 4px control radius, then a 2px gap and a 2px outline in the ring colour, instead of the box-shadow ring that sat right on the glyphs and the underline. The ring is painted on an out-of-flow `::after` box and only on `:focus-visible`, so the link's resting width, padding and radius are unchanged, and it stays visible in forced-colors mode. A link Button is now `position: relative`.
