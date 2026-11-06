---
'@hirobius/design-system': patch
---

`primitive.typography.size.displayMin` is `2.5rem`, not `40px` (hds#1334 review): the floor of `--semantic-typography-display-font-size-fluid` now follows the user's browser font size. At the default 16px root it is still 40px, and the fluid curve is unchanged. Figma draws it as 40px.
