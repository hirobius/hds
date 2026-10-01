---
'@hirobius/design-system': patch
---

The docs-site sidebar model is deleted (hds#431). `src/app/data/hds-nav-data.ts`, `nav-model.ts` and `nav-model.json` held the navigation of the docs shell, which went with the docs SPA (#51) and `HdsDocsShell` (0.20.0). Nothing imported them and the package never exported them, so no import changes. In `hds-manifest.json`, `componentSpecs.Sidebar.consumers` no longer lists `src/app/data/nav-model.ts`.

`./manifest` (and `public/hds-manifest.json`) drops the top-level `health` field (hds#431). It was a snapshot dated 2026-06-18 that no script wrote; the token build forwarded it unchanged, so it still named removed components (NavGroup, StepperField, Sketch) and file paths that no longer exist. The token build no longer writes it, and nothing in the package read it. `SystemManifest` never declared it, so no type changes. If you read `manifest.health`, it is now `undefined`.
