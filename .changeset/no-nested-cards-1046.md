---
'@hirobius/design-system': minor
---

New `hds/no-nested-cards` ESLint rule, on as an error in `hds/recommended` (hds#1046): no cards within cards, ever. It fails when a `Card` or section surface (`Surface`, `Callout`) renders inside another, including a section surface wrapping a card list. Declare the group with type hierarchy (a section title, a count, metadata) on a plain region instead. Add your own card or surface wrappers through its `cards` / `surfaces` options. DESIGN.md's Card Anatomy states the rule.
