---
'@hirobius/design-system': minor
---

New `List` (with `List.Group`, `List.Item`, `List.Empty` and `List.Tile`): an inset grouped list. A group's heading (a title, a count Badge, an optional action) sits above a raised, rounded surface of rows. Each row is one tappable link or button, at least 56px tall and named by its title. It holds a leading tile, a title, a one-line description, a one-line tertiary meta, and one quiet trailing affordance: a chevron, a count or an icon button. Secondary actions go in an overflow Menu (`actions`). The list draws the inset dividers, starting at the text column. `variant="plain"` drops the surface for page feeds. The rhythm comes from new `component.list.*` tokens (groupGap, headingGap, rowPadding, rowMinHeight, leadingSize), aliased to the space and size scales, with the new `semantic.size.listRow` and `primitive.size.56` steps. Requested by the job-hunt thread.
