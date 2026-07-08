---
'@hirobius/design-system': minor
---

Add `Reveal` and `Pin` scroll primitives (#116) to the core library — CSS scroll-driven, **zero JS and zero dependencies**. `Reveal` fades/slides/scales content in as it enters the viewport via `animation-timeline: view()` (`animation`: `fade | fade-up | fade-down | scale`); `Pin` is a token-friendly `position: sticky` wrapper (`top` offset) for pinned scroll scenes. Both are progressive-enhancement-safe: content is fully visible by default and the effect applies only where `animation-timeline` is supported and the user has not requested reduced motion (a `@media (prefers-reduced-motion: reduce)` + `@supports` fallback). Composes with the opt-in `@hirobius/design-system/scroll` primitives (`SmoothScroll`, `useScrollProgress`) for the full "pinned scale-reveal" hero effect on our own stack — no GSAP, no Lenis required (Lenis remains an optional add-on for momentum). See ADR-021.
