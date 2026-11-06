---
'@hirobius/design-system': minor
---

Breaking: the root `hds` and `tokens` exports are removed (deprecated since 0.34.0, hds#1205). Import them from `@hirobius/design-system/tokens`; `npx -p @hirobius/design-system@0.34 hds-tokens-subpath` moves the imports. The main entry no longer carries the token JSON (hds#1347).
