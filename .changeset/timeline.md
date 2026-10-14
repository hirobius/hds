---
'@hirobius/design-system': minor
---

New `Timeline` and `TimelineItem`: dated events grouped by day under headings on a rail, newest first (or `order="asc"`). Each item takes an optional `icon` and a feedback `tone`, and expands to show detail when it has children. `<Timeline aria-label="History"><TimelineItem date={shippedAt} title="Shipped 0.24" tone="success">Release notes</TimelineItem></Timeline>`.
