---
'@hirobius/design-system': patch
---

Text links: a thicker underline. `.hds-link` (InlineLink and anything that composes it) now draws a 2px underline 0.2em below the baseline, from the new `semantic.link.underlineThickness` and `semantic.link.underlineOffset` tokens, instead of the font's hairline default. Small text caps the line at 0.125em, and the underline still breaks around descenders.
