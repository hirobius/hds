---
'@hirobius/design-system': minor
---

Card.Facts gains an opt-in `truncateFirst` prop (hds#1550). When true, the first fact clamps to one line with an ellipsis in both layouts, so a long place name no longer wraps; the full text stays in the DOM and in `title`, and the icon keeps its size. Off by default, so nothing changes until you set it.
