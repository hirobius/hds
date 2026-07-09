---
'@hirobius/design-system': patch
---

Add the AI-legibility recipe and golden-path stories for #116's scroll primitives. `llms.txt` gains a "How To Build A Scroll-Driven Section" recipe naming `Reveal` and `Pin` (CSS, zero JS) first, `useScrollProgress` (from `@hirobius/design-system/scroll`) for JS-driven values, and `SmoothScroll` for opt-in Lenis momentum — with progressive-enhancement and `prefers-reduced-motion` guidance. `src/stories/patterns-scroll.stories.tsx` adds three golden-path stories: a `Reveal` sequence, a pinned scale-reveal scene (`Pin` + `useScrollProgress` + `motion/react`), and a simple parallax built from `useScrollProgress`. No new component/API surface — that stays scoped to #66.
