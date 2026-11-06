---
'@hirobius/design-system': patch
---

New `withViewTransition(update)` (hds#751): runs a DOM update inside a View Transition when the browser supports `document.startViewTransition`, and runs it at once, with no animation, when it does not or when the user prefers reduced motion. It takes the update as a callback, so it works with any router or state setter, and adds no dependency.
