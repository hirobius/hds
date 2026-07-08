# ADR-021: Animation engine — Motion in core, GSAP/Lenis kept downstream-only

- **Status:** Accepted
- **Date:** 2026-07-08
- **Decider:** Adrian
- **Related:** #116 (scroll-driven motion primitives), #66 (expression layer + motion presets), `.size-limit.cjs` (bundle budgets), ADR-013 (escape-hatch policy), hirobius/clients#22 (`brand.motion` scroll-reveal)

## Context

A research session on building an Awwwards-tier scroll effect proposed the
industry-standard stack: **Lenis** (smooth-scroll momentum) + **GSAP
ScrollTrigger** (pin + scrub) + a GSAP timeline for a "scale & reveal" hero
zoom. That raised a real architectural question for HDS: adopt GSAP into the
core library, or swap our existing engine (**Motion**) over to GSAP entirely?

Where HDS actually stands today:

- **Engine:** `motion` 12.23 (`motion/react`), our single animation engine.
- **Dependence (source scan, 2026-07-08):** `<motion.*>` declarative elements in
  **38 files**; **`AnimatePresence` in 6 files** (exit animations tied to React
  unmount — alert, disclosure, image-lightbox, tooltip, …); `whileTap` in 5;
  a declarative **spring** in the `expressive` motion token; `useAnimationControls`
  in 1. **`useScroll`/`useTransform`: 0** — we do not yet use Motion's scroll API.
- **WebGL:** `three` 0.183 is already a dependency (mobius distortion).
- **CSS scroll precedent:** `stacked-card-rail.tsx` already ships **CSS
  scroll-driven animation** (`animation-timeline`) + `position: sticky` — the
  dependency-free equivalent of GSAP's pin/scrub.
- **Constraints:** no new deps without approval (CLAUDE.md §0); `check-reduced-motion`
  gate; SSR/Astro island-safety (ADR/#64); tokenized motion (`hds.motion.*`);
  Swiss-canon product core vs the expression/marketing layer (#66).

HDS is a **React product component library first**; the art-directed marketing
surface (#66) is secondary.

## Decision

1. **Motion remains the single animation engine inside the published library.**
2. **GSAP and Lenis are NOT added to `@hirobius/design-system`.** They are
   **app-level / downstream tools** — used in marketing sites and the
   `hirobius/clients` factory when bespoke scroll choreography is genuinely
   required, initialized once at the site root, never shipped to every consumer.
3. **Core scroll effects use CSS scroll-driven animation first**
   (`animation-timeline: view()/scroll()`, `position: sticky`), and **Motion's
   `useScroll`/`useTransform`** where JS is genuinely needed — both ~0 KB
   net-new. Every scroll primitive is reduced-motion-gated and SSR/island-safe.
4. **No smooth-scroll momentum (Lenis) in core.** If a specific site wants the
   momentum feel, Lenis is an **optional root-level dependency of that app**, not
   of the library.

## Consequences

**Bundle (the concrete numbers).** GSAP core ≈ 23.5 KB gzip + ScrollTrigger ≈
11 KB + Lenis ≈ 3.5 KB ≈ **35–38 KB gzip net-new**, and they become _mandatory_
deps. The main barrel budget is **185 KB gzip** (hard-fail in CI), currently
~157 KB — **~28 KB headroom**, so GSAP + ScrollTrigger alone breaches the budget
outright if bundled in the barrel. The Motion + CSS path is **≈ 0 KB net-new**
(Motion is already a peer dep; CSS `animation-timeline` is zero JS).

**Migration cost of a full swap (rejected path).** Swapping Motion → GSAP means
rewriting 38+ interaction-critical components from a declarative, React
lifecycle-tied model into imperative ref + timeline code with manual cleanup.
`AnimatePresence` exit-on-unmount has **no clean GSAP equivalent** — you
hand-roll "hold the unmount, animate out, then remove," exactly the imperative
lifecycle bug surface a component library should avoid. And there is **no bundle
win**: once you add ScrollTrigger + a Flip/layout solution + gesture wiring to
replicate `AnimatePresence`/`layout`/`whileTap`, GSAP lands at parity or heavier.

**Engine fit.** GSAP's real superpower is imperative, scroll-scrubbed _timeline
choreography_ — the expression/marketing workload (#66), not the core's. The
core's workload is component-scoped, lifecycle-tied, gesture/spring animation —
Motion's home turf. A swap would optimize the core engine for the secondary
surface's needs.

**Portability & AI-legibility.** The portability path we shipped in #64 is CSS
`animation-timeline`, which out-portables GSAP (works with zero JS in static
Astro). Declarative `<motion.div animate={…}>` is also far more AI-legible for
this self-building system than imperative GSAP timelines with manual teardown.

**Net:** one engine in the library (Motion), zero engine duplication, no budget
breach, and GSAP/Lenis available downstream where they earn their weight.

## Alternatives considered

- **A. Add GSAP alongside Motion in core** — rejected: two engines, ~35 KB that
  breaches the size budget, and redundant with Motion + CSS for everything the
  core needs.
- **B. Swap Motion → GSAP entirely** — rejected: 38-file rewrite of the most
  interaction-sensitive components, loses `AnimatePresence`/declarative
  gestures/springs, no bundle win, optimizes the core for the secondary surface.
- **C. Motion + CSS scroll-driven animation in core; GSAP/Lenis downstream-only**
  — **Accepted.**

## When this flips

Revisit if HDS pivots to **art-direction/marketing-first**, or if **non-React
targets** become a primary shipping surface — in either case GSAP's
framework-agnostic, timeline-centric model becomes defensible. Neither is true
today. (Licensing is **not** a factor: GSAP, including its plugins, is free
under Webflow as of 2024–2025.)
