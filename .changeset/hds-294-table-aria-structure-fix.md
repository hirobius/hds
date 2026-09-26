---
'@hirobius/design-system': patch
---

Table: fix invalid ARIA structure from the sortable-columns change (hds#294 review). The grid now carries `role="table"`, header/data rows are wrapped in `role="row"` elements (`display: contents`, so CSS Grid layout is unaffected), every header cell has `role="columnheader"` (not just sortable ones), and data cells have `role="cell"` — so `aria-sort` no longer sits on an orphan columnheader outside any table/row ancestry. Also drops the manual `onKeyDown` on the sort button (native `<button>` already turns Enter/Space into a click; the duplicate handler risked a double-toggle in browsers with inconsistent Space-keyup behavior).
