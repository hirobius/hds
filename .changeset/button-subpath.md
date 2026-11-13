---
'@hirobius/design-system': patch
---

Button: new `@hirobius/design-system/button` subpath, so an app with a tight entry budget can import Button without the root barrel. The root still exports Button, and both give the same component, with no visual change. The subpath is 5.78 kB gzip (size-limit) with its packages external.
