---
'@hirobius/design-system': patch
---

Table: the frame now has a full 1px `border.default` outline by default, with the rounded container radius and clipped overflow (hds#1198, reverses the hds#891 "no outer border" choice for Table only). The raised header and row dividers stay; the last row draws no second line, and an empty table's header draws no rule. Cells center their content vertically with equal top and bottom density padding.
