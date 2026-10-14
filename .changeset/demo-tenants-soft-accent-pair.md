---
'@hirobius/design-system': patch
---

Two demo tenant overlays join the compiled tenant CSS, both opt-in with `data-brand`: `soft-demo` (pill actions, 24px containers, a grey fill for raised surfaces, 32px surface padding; the hds#505 direction) and `accent-pair-demo` (a mauve primary accent, a stone supporting accent kept as a CSS-variable overlay outside the package). Neither applies unless an app sets `data-brand="soft-demo"` or `data-brand="accent-pair-demo"`, so nothing changes by default.
