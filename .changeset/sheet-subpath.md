---
'@hirobius/design-system': patch
---

Sheet: new `@hirobius/design-system/sheet` subpath, so an app with a tight entry budget can import Sheet without the root barrel. The root still exports Sheet, and both give the same component. The subpath is 2.94 kB gzip with its packages external (it brings the Dialog parts and OverlayClose it is built from). In an app that already ships Dialog, it adds 0.73 kB gzip.
