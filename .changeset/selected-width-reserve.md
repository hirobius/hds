---
'@hirobius/design-system': patch
---

Tabs, Tag and SegmentedControl keep a text label at its selected (semibold) width in every state, so selecting one no longer nudges its neighbours by a pixel or two. A plain-text label now sits in a `span.hds-selected-width` whose hidden, zero-height `::after` holds the semibold copy (from `data-text`). The DOM still holds the text once, so screen readers and `getByText` see one label; a test that read a Tag pill's classes through `getByText` now gets the inner span and should use `.closest()`. Pagination needs nothing: its Button label is already semibold in every state.
