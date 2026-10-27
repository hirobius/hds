---
'@hirobius/design-system': patch
---

New `hds-tokens` bin: `pnpm exec hds-tokens search <name or words>` says whether a token name exists and lists the nearest real names, so a guessed name like `--semantic-content-tertiary` is caught before it ships (hds#477). `docs/CONSUMING.md` gains "Finding a token name" and a size-vs-space rule; `Toggle`, `Radio` and `Alert` now size through `semantic.size` roles instead of `primitive.size` steps, with no visual change (hds#482).
