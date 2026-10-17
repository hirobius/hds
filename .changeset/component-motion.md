---
'@hirobius/design-system': patch
---

Components move on the motion tokens. Button's press wash eases in and a toggle Button's new label settles in; Tabs and SegmentedControl slide one indicator to the selected item; Menu, Popover, Select, Tooltip, Dialog and AlertDialog animate open and closed; Toast slides in and fades out. New `PresenceList` / `PresenceItem` animate list items in (with a brief highlight) and collapse removed ones, and `SkeletonSwap` fades loaded content in over its skeleton. Every bare `transition-*` utility now times on the productive motion token, and everything lands at once under `prefers-reduced-motion`.
