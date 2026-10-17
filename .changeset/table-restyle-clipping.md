---
'@hirobius/design-system': minor
---

Table no longer shears its content on desktop, and its default look is restyled.

**Fix.** Every column used to be `minmax(0, 1fr)`, so a long link, a date or a row of buttons could not widen its column: it spilled out of its cell, under the next column, and past the table's edge where nothing could scroll to it. A column without its own `width` is now `minmax(min-content, 1fr)` with a one-tile floor (`semantic.size.tile`): text wraps between words, an `action` cell (a bare link) wraps anywhere, a `value` or `token` cell (a date, a number, a token name) never wraps, and when the columns cannot fit, the table scrolls inside its own frame with a faded edge on the side that has more columns.

**Restyle (before → after).** Before: a raised surface fill behind the whole table, a `surface.overlay` header in the 12px caption style, horizontal rules only, body text at medium weight. After: a thin `border.subdued` frame with rounded corners and no fill, a softly tinted `surface.raised` header in the ui style (medium weight, sentence case), taller body rows (`space.scale.sm` vertical padding), thin horizontal rules between rows and vertical rules between columns (header included), no zebra stripes, and body text at the regular weight. New opt-in `emphasizeFirstColumn` sets the first column in the medium weight for a row-label column.
