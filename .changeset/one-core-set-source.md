---
'@hirobius/design-system': patch
---

One source for the core set. The ratified core list now lives in `mcp/core-set.mjs`, and the hds-mcp server and `AGENTS.md` build the guide's wider set on it. `list_core` and `AGENTS.md` now call that wider set "recommended" (`list_core` gains a `set` field, `get_component` marks `recommended: true`), and `get_component` marks `core: true` only for the 43 ratified components, matching the manifest flag. The names shown are unchanged.
