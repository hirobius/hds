---
'@hirobius/design-system': patch
---

CSS-in-JS → Tailwind (#60): migrate `DocLinkCard` to Tailwind + `cva` (`docLinkCardVariants`), formalizing the `variant` (`feature` | `pager`) axis. Inline `style` objects for layout (padding, gap, flex direction, absolute positioning, margins) are replaced with Tailwind classes bound to the same `--semantic-space-*` custom properties; typography composites (`heading3`/`ui`/`caption`) stay inline per the existing HDS pattern, with color/margin moved onto the shared `text-primary`/`text-secondary` utility classes. RTL (`isRtl`) and directional-affordance logic are preserved exactly — the pager icon/title left-right decision is now a single derived boolean equivalent to the prior nested ternaries. `motion/react` icon-nudge animations (`headerIconControls` / `pagerIconControls`) are untouched.

No breaking changes: all public props, defaults, and rendered DOM/ARIA structure are unchanged. `docLinkCardVariants` is an additive `@internal` export (compose via `DocLinkCard` props instead, per the variant-contract convention).
