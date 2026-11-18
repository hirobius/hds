---
'@hirobius/design-system': minor
---

Every control of a size now has one height: `semantic.size.controlHeight.sm | md | lg` (32, 40 and 48px). Button (was 36 / 44 / 52), Input, Select, Combobox, Tabs, SegmentedControl and Pagination read it, so a Button beside an Input lines up. A coarse pointer or a narrow viewport still lifts sm and md controls to 44px (`hds-touch-row`). `component.button.size.*.height` and `component.pagination.compactControlSize` now alias the new token. No prop changes.
