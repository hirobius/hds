---
'@hirobius/design-system': patch
---

`Toast`: a new toast now eases up into the stack (fade + 8px rise) on the productive motion token instead of popping in. Swipe-to-dismiss and the slide-out are unchanged; the swipe follow now uses the CSS `translate` property so it composes with the enter. Under `prefers-reduced-motion` the toast appears at rest (hds#751).
