---
'@hirobius/design-system': minor
---

CSS-in-JS → Tailwind (#93): migrate `Token` fully to Tailwind + `cva` (`tokenShellVariants` / `tokenNodeInlineVariants` / `tokenLabelVariants`), replacing `Token.module.css` (deleted) and a duplicate inline-style `isSelected` override with one variant set on the same `--semantic-*`/`--component-*`/`--primitive-*` custom properties — no visual or prop changes.

`SegmentedControl`'s active×hover×pressed×disabled×secondary state matrix is also converted to `cva` compound variants (`segmentedControlWrapperVariants` / `segmentedControlRailVariants` / `segmentedControlItemVariants` / `segmentedControlIndicatorVariants` / `segmentedControlDescriptionVariants` / `segmentedControlLabelVariants` / `segmentedControlFocusRingVariants`), replacing the inline `style` objects with the same tokens. Per ADR-015 the component keeps its own hover/focus tracking (not the shared `useInteractionState` hook, out of scope here) — only the class composition changed.

No breaking changes: all public props, prop vocabularies, and rendered DOM/ARIA structure are unchanged for both components. The new `*Variants` exports are additive (compose via component props instead, per the variant-contract convention).
