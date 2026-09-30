---
'@hirobius/design-system': minor
---

The ratified core set is now machine-readable (hds#374): the 42 core components of the hds#254 disposition table carry `core: true` on their spec in `public/hds-manifest.json` (the `./manifest` subpath), in `component-api.json` and in the agent manifest projection. `core` is a new optional boolean in `manifest/schema.json`, independent of `tier`: five core components are `tier: pattern`, and most `tier: primitive` components are not core. Non-core specs omit the field.
