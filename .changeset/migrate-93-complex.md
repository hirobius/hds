---
'@hirobius/design-system': minor
---

CSS-in-JS→Tailwind migration (#93): convert `Table` and `Disclosure` off inline
`CSSProperties` objects onto Tailwind semantic classNames, then adopt `cva`.

- `Table`: `density` (`comfortable | compact`) — the variant contract's
  canonical density example — plus column `align` and `stickyHeader` are now
  `cva` axes (`tableHeaderCellVariants`, `tableDataCellVariants`) driving
  Tailwind padding/min-height/position utilities bound to the same semantic
  tokens the previous inline styles referenced. Sort/selection are not
  implemented on `Table` (none existed pre-migration); `stickyHeader`
  positioning behavior is unchanged.
- `Disclosure`: the `variant` (`panel | nav | card`) trigger styling is now
  `cva`-driven (`disclosureTriggerVariants`). Open/closed state moved from a
  JS `hovered`-state-driven inline style to a Radix-style
  `data-state="open"|"closed"` attribute with `data-[state=open]:` Tailwind
  selectors — same visual result, no more mousemove-triggered re-renders. The
  `motion/react` height/opacity/chevron-rotation animation is untouched (still
  JS-driven, not a CSS transition).

No public prop or export renames — both components keep their existing prop
API. `tableHeaderCellVariants`/`tableDataCellVariants`/
`disclosureTriggerVariants` are new `@internal` cva-helper exports (same
pattern as `buttonVariants`) — compose via component props, not directly.
