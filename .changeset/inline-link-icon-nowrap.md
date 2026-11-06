---
'@hirobius/design-system': minor
---

`InlineLink`: the external-link icon no longer wraps alone onto the next line. Breaking (DOM): the icon now sits inside a span in the link, so a selector like `a > svg` must become `a svg`. The icon and the link's last word now always break together, for example in a narrow table cell.
