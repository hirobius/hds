---
'@hirobius/design-system': minor
---

Add the `@hirobius/design-system/brand` subpath (#64): a framework-free palette → HDS-semantic overlay bridge. `brandOverlayVars` / `brandOverlayStyle` / `brandOverlayCss` map a small brand palette (six colours + optional font/radius) onto the HDS semantic custom properties, so a downstream render target (a static Astro site, an SSR shell, an email) can theme itself from a brand palette while inheriting HDS's contrast-checked semantics, accent states, and radius. Interactive accent states are derived with CSS `color-mix()` — no colour-math dependency. Imports no React and no Node built-ins. This is the seam that lets the `hirobius/clients` Astro factory consume HDS instead of maintaining a parallel `--brand-*` token system.
