---
'@hirobius/design-system': patch
---

New `hds-prop-map` codemod (hds#460), the first one driven by the upgrade ledger: it reads `prop-renamed` and `prop-value-mapped` steps (`prop: { component, name, to | values }`) and rewrites `<Button tone="x">` to `<Button variant="x">` or `<Stack direction="vertical">` to `<Stack direction="column">`, following aliases and namespace imports, in code and `.mdx`. A release that renames a prop now ships a ledger step instead of a new bin. `npx @hirobius/design-system@latest upgrade` hands each codemod the steps that name it; run it alone with `npx -p @hirobius/design-system@^0.33.0 hds-prop-map --ledger <file>`.
