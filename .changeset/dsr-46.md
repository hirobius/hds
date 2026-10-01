---
'@hirobius/design-system': patch
---

Kept components stop rendering IconButton and Cluster inside (hds#392), so both can be deprecated (#389) without warning consumers about components they never used.

- **Pagination and InlineCode:** Previous, Next and the copy button are now `Button iconOnly` with an `aria-label` and a 16px `Icon` (`size="small"`). The rendered markup is byte-identical: same element, classes, attributes and accessible names ("Previous page", "Next page", "Copy", "Copied").
- **PageHeader, FormActions, DataTableSection and DestructiveSection:** their wrapping rows are now `Stack direction="row" wrap="wrap"` with `align` and `justify` passed explicitly. Layout is unchanged (direction, wrap, gap, alignment and distribution), but the row elements inside these 4 patterns now carry `data-hds-component="Stack"` instead of `data-hds-component="Cluster"`, and their inline style adds `flex-direction: row`, the initial value. Update any selector or test that targets `[data-hds-component="Cluster"]` inside one of these patterns.
- **AssetImg's expand pill (internal ExpandTooltip):** the label now uses `content.onAccent` instead of fixed white. In dark mode `surface.accent` is a light neutral, so white text read at 1.09:1; it now reads 17.32:1 (light mode is unchanged at 18.88:1).
