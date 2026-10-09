---
'@hirobius/design-system': patch
---

The package now ships `dist/css-contract.json` (hds#449): for each stylesheet it exports, every CSS custom property with its value per context (`:root`, dark, compact, each `[data-brand]`, each `@media`), the class names, the `@font-face` entries and the `@layer` names, plus `publicClasses` (the classes you may write yourself: `hds-focus` and the `static.css` set, also listed in `public/hds-manifest.json`). The upgrade ledger reads it, so from the next release a removed CSS variable or `hds-*` class needs a breaking upgrade step, and a changed token value a look step that `npx @hirobius/design-system upgrade` reports where your code uses it. Nothing changes in the stylesheets themselves.
