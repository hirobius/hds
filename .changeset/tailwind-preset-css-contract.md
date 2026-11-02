---
'@hirobius/design-system': patch
---

Ship the Tailwind theme preset as `@hirobius/design-system/tailwind-preset`, so an app that compiles its own Tailwind imports it instead of copying `tailwind.config.tokens.cjs`; the upgrade command now flags a vendored copy whose keys drifted. Each release records the preset's keys, and the published stylesheets keep every utility the last release shipped until an upgrade step removes it.
