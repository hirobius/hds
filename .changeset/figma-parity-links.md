---
'@hirobius/design-system': patch
---

Five components link the right Figma node in the component manifest (`hds-manifest.json`), found by the first full parity read of the library (hds#1565). `EmptyState`, `Surface`, `Pagination` and `Tooltip` now link their component set, where the link named one variant. `Field` links the Field set, where it named the FormField set. No component, prop or token changes.
