---
'@hirobius/design-system': patch
---

Fix: with `data-theme="dark"` on an element inside the page (not `<html>`), the shadows and other composite tokens that reference theme colours stayed in their light values. They are now re-declared in the dark block, like the bare aliases already were.
