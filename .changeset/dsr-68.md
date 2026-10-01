---
'@hirobius/design-system': patch
---

The docs-site sidebar model is deleted (hds#431). `src/app/data/hds-nav-data.ts`, `nav-model.ts` and `nav-model.json` held the navigation of the docs shell, which went with the docs SPA (#51) and `HdsDocsShell` (0.20.0). Nothing imported them and the package never exported them, so no import changes. In `hds-manifest.json`, `componentSpecs.Sidebar.consumers` no longer lists `src/app/data/nav-model.ts`.
