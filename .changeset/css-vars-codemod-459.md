---
'@hirobius/design-system': patch
---

New `hds-css-vars` codemod (hds#459): renames HDS CSS custom properties in a consumer's stylesheets and code (.css, .scss, .html, .mdx, .ts, .tsx, .astro and the rest), in reads and in declarations, from ledger steps whose `auto.codemod` is hds-css-vars (`auto.args` as `[from, to]` pairs), and lists every variable a `removed` step names for a manual edit. `--check` and `--dry-run` write nothing; the upgrade command runs it like any other codemod.
