---
'@hirobius/design-system': patch
---

The root `hds` and `tokens` exports stay one release longer: they are removed in 0.36.0, not 0.35.0 (hds#1205, #1347). Import them from `@hirobius/design-system/tokens`; `npx -p @hirobius/design-system@0.34 hds-tokens-subpath` moves the imports.
