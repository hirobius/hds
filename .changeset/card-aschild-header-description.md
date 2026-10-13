---
'@hirobius/design-system': patch
---

Three additions for app screens, promoted from the ops dashboard so apps stop hand-rolling them:

- `Card asChild` renders the card as its one child (an `<a href>`, a router `Link`, a `<button>`), so a whole card is one link with the interactive-card hover from DESIGN.md: `scale(1.02)` and the `elevation.raised` shadow, a focus ring, and no transform under reduced motion. The root carries `data-interactive="true"`.
- `PageHeader description` puts one supporting line under the title in secondary body text (`data-slot="description"`).
- `@hirobius/design-system/icons` adds `ArrowUpRight`, `Briefcase`, `Images`, `Phone`, `Users` and `Wrench`.
