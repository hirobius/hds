---
'@hirobius/design-system': patch
---

The ESLint plugin gains `hds/no-removed-import` (error in `recommended`, hds#469): importing an export whose `@removeIn` version the installed package has reached is an error, naming the version and the replacement. `eslint-plugin/rules/deprecated-exports.json` now also lists deprecated props (`props`) and prop values (`propValues`) with their owning type. No component changes.
