---
'@hirobius/design-system': patch
---

The ESLint plugin gains `hds/no-deprecated-import` (warn in `recommended`, hds#469): importing a `@deprecated` export (MetricTile, MetricTiles, Stat, StatusTile, CardMetricProps today) names the version that removes it. Its data, `eslint-plugin/rules/deprecated-exports.json`, is generated from the package's JSDoc by `scripts/build-deprecations.mjs` and ships in the package; a drift test keeps it current. No component changes.
