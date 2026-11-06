---
'@hirobius/design-system': minor
---

`@hirobius/design-system/tokens` now exports the raw DTCG tokens as `tokens` and the token bridge as the named export `hds` (still the default export too), next to `ct` and `tokenValues` (hds#1205). The root `hds` and `tokens` exports still work but are deprecated and leave in 0.35.0; run `npx -p @hirobius/design-system@0.34 hds-tokens-subpath` (or the upgrade command) to move the imports. Once an app imports both from `/tokens`, its bundler drops the token JSON from a components-only root import.
