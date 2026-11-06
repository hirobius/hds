---
'@hirobius/design-system': patch
---

New type token `semantic.typography.uiRegular` (ADR-052 addendum, hds#1198): the ui size, line height and family at weight 400, for table body cells and other plain UI text. Ships as `--semantic-typography-uiRegular-*`, `hds.typeStyles.uiRegular` and the Figma text style `typography/uiRegular`. Table body cells now use it; they render the same as before.
