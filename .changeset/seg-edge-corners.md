---
'@hirobius/design-system': patch
---

SegmentedControl: the selected primary segment's raised edge now follows the segment's rounded corners. It was an inset shadow over the fill, which left the fill's anti-aliased rim showing at the bottom corners (a light line under the edge in dark mode). Fill and edge are now one background layer. `.bg-transparent` and `.bg-current` now set `background-color` only, as in Tailwind, instead of the `background` shorthand that also cleared `background-image`.
