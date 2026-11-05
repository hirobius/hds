---
'@hirobius/design-system': patch
---

Button keeps its hard edge on keyboard focus, and the focus ring now wraps the button and its edge: the 2px gap and the 2px ring are drawn on the face and again offset by the edge height, so they follow the face-plus-edge shape at rest, hover and press, for primary, secondary and every status tone. Tertiary and disabled keep the plain ring. In forced-colors mode a hard-edge Button draws a 2px `Highlight` outline on focus (hds#897).
