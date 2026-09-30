---
'@hirobius/design-system': minor
---

Add three screen-level patterns to `@hirobius/design-system/patterns`: `PageHeader` (breadcrumb, title fixed at `heading2`, status and actions slots), `MetricTiles` with `MetricTile` (one fixed-height tile, `min(tiles, 4)` columns) and `FormActions` (primary right-most and last in DOM order, destructive on the far left). The manifest's `patternInventory` is now derived from a new `@screenPattern` JSDoc tag instead of a directory that no longer exists, `llms.txt` names the three patterns in "How To Lay Out A Screen", and `DESIGN.md` gains the page-title rule and a "Which one, when" table for `MetricTiles`, `Stat`, `Card.Metric` and `StatusTile`.
