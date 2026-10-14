---
'@hirobius/design-system': minor
---

`Icon`'s `color` and a `Table` column's `width` now accept only token-shaped values, so a colour or width can't be hard-coded through them. `color` is the new `IconColor` type: `currentColor` (still the default), `inherit`, or a `var(--semantic-…)` / `var(--component-…)` token variable. A column `width` is the new `TableColumnWidth` type: `auto`, `min-content`, `max-content`, an `fr` value, a `minmax(…)` track or a `var(--…)` token variable; a raw `px` or `rem` width is a type error. Runtime output is unchanged; only the TypeScript types narrow.
