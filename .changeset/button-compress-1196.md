---
'@hirobius/design-system': patch
---

Button (hard shadow): hover and press now compress the button instead of growing it downward (hds#1196). Rest is a 3px edge; hover moves the face down 1px onto a 2px edge; press moves it down the full 3px onto a 0px edge. The bottom of the edge does not move, so the layout does not shift. Reduced motion still makes the change instant.
