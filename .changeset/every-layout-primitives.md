---
'@hirobius/design-system': minor
---

Add the "every-layout" layout primitives (#96): `Cluster` (wrapping flex row with tokenized gap/align/justify), `Center` (max-width column with auto margins and an optional tokenized gutter), `Sidebar` (fixed-width rail + fluid content that wraps to stacked via flex-basis/flex-grow disparity, no media query), `Switcher` (flips a row to a column below a `threshold` via the flex-basis calc() technique, with a `limit` to force stacking), `Cover` (vertical shell with an optional header/footer and an auto-margin-centered main region), `Frame` (aspect-ratio-locked, token-clipped media box — a thin radius/overflow skin over `AspectRatio`), and `Bleed` (controlled negative-margin full-bleed within a padded container). All seven are `as`-polymorphic, `forwardRef`, and token-driven — spacing resolves off the `--semantic-space-layout-*` scale, never raw px.
