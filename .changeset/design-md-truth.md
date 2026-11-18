---
'@hirobius/design-system': patch
---

The generated rule documents (`DESIGN.md`, `llms.txt`, `llms-full.txt`, `AGENTS.md`, the consumer skill and the MCP guide) no longer teach a deprecated API. A row of headline numbers is now a `Grid` of `Card`s with the type roles; `MetricTiles`, `Stat` and `Card.Metric` stay deprecated with no replacement. The Button row lists the four variants from the manifest (secondary is a soft tonal fill, not an outline), the Card title is the `title` role and the Badge radius is `component.badge.radius` (6px). The generators now fail when a document recommends anything in `deprecations.json`. No component or token changes.
