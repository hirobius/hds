---
'@hirobius/design-system': patch
---

New `hds-token-keys` codemod (hds#955), the second one driven by the upgrade ledger: it reads a step's `tokens` map (`{ 'density.md': 'semantic.space.scale.sm' }`) and rewrites `hds.density.md` to `hds.semantic.space.scale.sm` in code and `.mdx`, following an alias (`hds as t`) or a namespace import, and leaving comments and strings alone. This release's step moves the deprecated `hds.density` steps to their scale twins (sm to xs, md to sm, lg to md, xl to lg, xl2 to xl: the same pixels); `density.xs`, `xl3` and `xl4` have no twin, so the upgrade command lists them for you to change by hand. `npx @hirobius/design-system@latest upgrade` runs it; run it alone with `npx -p @hirobius/design-system@^0.33.0 hds-token-keys --ledger <file>`.
