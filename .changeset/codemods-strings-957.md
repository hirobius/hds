---
'@hirobius/design-system': patch
---

The codemods and the upgrade command now read `.astro`, `.vue` and `.svelte` files (hds#957). The upgrade command also checks HDS names inside strings and comments, such as an LLM prompt that says `<Stack direction="vertical">`, against the manifest and the upgrade ledger, and lists each wrong one under Do by hand as a check that never blocks.
