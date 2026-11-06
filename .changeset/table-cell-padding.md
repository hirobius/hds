---
'@hirobius/design-system': patch
---

`Table`: header and body cells read their own inline padding, the new `component.table.cell.paddingX` token (`--component-table-cell-paddingX`, `semantic.space.scale.md`: 28px, 16px compact), not `semantic.space.surface.padding`. The default look does not change. A tenant that makes surfaces roomier no longer widens every table cell: in the soft-demo direction, cells go from 40px to 28px at the comfortable density.
