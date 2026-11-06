---
'@hirobius/design-system': patch
---

`Table`: header and body cells read their own inline padding, the new `component.table.cell.paddingX` token (`--component-table-cell-paddingX`, `semantic.space.scale.md`: 28px, 16px compact), not `semantic.space.surface.padding`. The default look does not change. A tenant's surface padding no longer sets the cell padding: brutalist-demo cells go from 20px to 28px (8px to 16px compact), and docs-only soft-demo cells from 40px to 28px.
