---
'@hirobius/design-system': patch
---

`docs/CONSUMING.md` §11 and the `hds-consumer` skill now give the ESLint plugin install line against the repository's current name, `pnpm add -D "@hirobius/eslint-plugin-hds@github:hirobius/hds#path:/scripts/eslint-plugin-hds"` (the repository's pre-rename path is now a retired mirror). The plugin is not on npm, so this git-path line is the only install route; the same fix repoints the plugin README, the `meta.docs.url` ESLint prints beside each HDS rule violation, and the README's pointer to PR #39 (hds#373). A front-door test now fails if any doc, script or skill names the pre-rename repo.
