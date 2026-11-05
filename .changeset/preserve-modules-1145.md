---
'@hirobius/design-system': patch
---

The library build now keeps one file per source module under `dist/m/` instead of a few shared chunks, so a bundler drops the components you do not import. A Button-only import shrinks from 61.0 to 57.4 kB gzip, and a Tabs-only import from 10.1 to 5.2 kB. The package exports do not change. Deep imports into `dist/chunks/` were never public, and that folder is gone (hds#1145).
