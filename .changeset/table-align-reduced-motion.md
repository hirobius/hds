---
'@hirobius/design-system': patch
---

fix(polish): Table cell alignment + caption spacing, and reduced-motion guards (docs-site rubric findings).

- **Table**: data cells now `items-center` (was `items-start`), so a badge/status slot lines up on a shared vertical center with its text siblings instead of floating above them; the caption/description block gains a token gap so it no longer touches the table's header band.
- **Reduced motion**: the Button and Input loading spinners (`animate-spin`) and the Progress bar's width transition now carry a `motion-reduce:` guard, matching Spinner/Progress's existing policy, so they stop animating under `prefers-reduced-motion`.
