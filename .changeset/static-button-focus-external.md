---
'@hirobius/design-system': patch
---

static.css `.hds-button` matches the React Button for CSS-only consumers (hds#1545): on focus the hard edge stays the first shadow layer (the gap no longer paints over it), forced colors outline focus in `Highlight`, and new `.hds-ext` / `.hds-ext-icon` classes give an external button the arrow nudge (0.125em up-right on the productive motion token, eased in and out, none under reduced motion). `.hds-link__icon` no longer moves under reduced motion.
