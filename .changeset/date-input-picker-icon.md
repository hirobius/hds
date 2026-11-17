---
'@hirobius/design-system': patch
---

Input `type="date"`, `"time"` and `"datetime-local"` draw the HDS calendar or clock icon in the trailing slot, where Select draws its chevron, at the same size and colour as Input's other trailing icons. The browser's own glyph is invisible and covers that slot, so a click on the icon still opens the native picker. A `trailingVisual` replaces the icon. Firefox draws its own picker button, which CSS cannot restyle, so there the HDS icon steps aside. To make room in `styles.css`, seventeen safelisted utilities that no HDS component uses are gone (listed in the upgrade note).
