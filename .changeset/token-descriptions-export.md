---
'@hirobius/design-system': minor
---

`tokens` from `@hirobius/design-system/tokens` no longer carries `$description` text; it ships every value, type and extension as before. The descriptions moved to a new subpath, `@hirobius/design-system/tokens/descriptions`, as `tokenDescriptions`: a map from a token's dot path to its description. The tokens JSON graph drops from 22 kB to 11.5 kB gzip, so an app that needs only values loads less. `hirobius.tokens.json` itself is unchanged and still ships whole.
