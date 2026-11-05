---
'@hirobius/design-system': patch
---

Button: `variant="link"` draws its keyboard focus as an outline in the ring colour, 2px wide, 2px off the text, on the small control radius, instead of the box-shadow ring that sat right on the glyphs and the underline. It shows only on `:focus-visible`, so the link's resting width, padding and radius are unchanged, and it stays visible in forced-colors mode.
