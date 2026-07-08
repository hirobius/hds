---
'@hirobius/design-system': minor
---

Add the `@hirobius/design-system/scroll` subpath (#116): opt-in scroll-motion primitives. `SmoothScroll` is a Lenis momentum-scroll provider (reduced-motion-first — skips Lenis entirely when the user prefers reduced motion — and SSR-safe), `useLenis` re-exports Lenis's React hook, and `useScrollProgress` is a Motion-based `0→1` scroll-progress hook (no new dependency; works with or without `SmoothScroll`). `lenis` is an **optional peer dependency** (`pnpm add lenis` to use `SmoothScroll`) and is externalized from the build, so it never lands in the main barrel and consumers who don't import `/scroll` pay nothing. Refines ADR-021: GSAP stays out of the library; Lenis is in as an opt-in subpath rather than downstream-only.
