---
'@hirobius/design-system': minor
---

The ratified core set is published where consumers and agents read it (hds#374). The 42 core components of the hds#254 disposition table carry `core: true` on their spec in `public/hds-manifest.json` (the `./manifest` subpath), in `component-api.json` and in the agent manifest projection; `core` is a new optional boolean in `manifest/schema.json`, independent of `tier` (five core components are `tier: pattern`, and most `tier: primitive` components are not core), and non-core specs omit it. `llms.txt` gains a "Core set" section listing the 42 by name and category, and its "Which one when" lines mark them `[core]` (`Button: [core] Trigger an action…`; the name still comes first). The `hds-consumer` agent skill gains a "Core set" section before its allow-list, and the README a generated "What belongs in the system" section naming the core set by category and the 27 modules on `@hirobius/design-system/patterns`.
