---
'@hirobius/design-system': minor
---

Every filled Button now looks raised (hds#1387). The primary Button's bottom edge was almost the same colour as its near-black fill in light mode (1.16:1), so it looked flat; it is now a visible lighter lip (`semantic.color.edge.primary` light `#424a56`, 2:1 against the fill). The default dark primary edge is unchanged. Computed primary edges for accents and tenants now keep the same 2:1 floor, so cobalt and accent-lilac edges get slightly deeper in light and dark. The edge height and the hover and press offsets are new tokens, `component.button.depth.{edge,hoverOffset,pressedOffset}` (3px, 1px, 3px), and every raised variant, tone, size, toggle and icon-only Button reads them. Pagination's current page and CodeBlock's copy button are now raised too. Ghost (tertiary) and link stay flat by design.
