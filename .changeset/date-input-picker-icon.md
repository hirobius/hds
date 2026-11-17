---
'@hirobius/design-system': patch
---

Input `type="date"`, `"time"` and `"datetime-local"` draw the HDS calendar or clock icon in the trailing slot, where Select draws its chevron, at the size and colour of Input's other trailing icons. The browser's own glyph is invisible and covers a touch-target-wide strip over the icon, so a click there still opens the native picker. A `trailingVisual` replaces the icon. Firefox draws its own picker button, which CSS cannot restyle, so there the HDS icon steps aside.

To fit `styles.css`'s budget, the utility safelist no longer repeats an arbitrary-value, variant or group class that `utilities.css` writes by hand (it ships either way). One visible effect: `focus-visible:ring-2` draws only the HDS focus outline, without Tailwind's box-shadow ring under it.
