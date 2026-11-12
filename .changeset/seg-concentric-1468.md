---
'@hirobius/design-system': patch
---

SegmentedControl: the selected pill and each segment now round at the rail's radius minus its padding and border (7px by default, was 8px against a 12px rail), so the curves stay concentric, and stay so when `railPadding` changes (hds#1468). No DOM change.
