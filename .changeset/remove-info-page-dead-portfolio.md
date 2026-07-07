---
'@hirobius/design-system': minor
---

Remove `InfoPage` from the public API (#49) — a breaking change, bumped as
`minor` per the pre-1.0 semver-zero convention (0.x.y: breaking changes
increment the minor).

`InfoPage` was dead-portfolio scaffolding: a branded profile surface built
for the portfolio landing page that hardcoded the (already-deleted)
`/assets/adrian.webp` asset. It had no design-system-consumer use. Also
removes `src/app/data/projects.ts`, the portfolio project data it and the
now-deleted portfolio pages depended on — it has zero remaining importers.

Migration: none. `InfoPage` was never intended for consumption outside the
portfolio landing page; there is no drop-in replacement.
