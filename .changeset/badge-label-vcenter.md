---
'@hirobius/design-system': minor
---

Badge (and the count badge) now centres its label in the pill: it sat about 2px high. Padding is even top and bottom and the label is a span trimmed to cap height (`text-box-trim`, where supported). A Badge's text is now inside an inner `<span>`, so a query like `getByText('Beta')` returns that span, not the Badge root. The `component.badge.paddingShift` token (the 1px lift) is removed, and the CSS-only `.hds-badge` drops the same lift. Tag was within 0.5px and is unchanged.
