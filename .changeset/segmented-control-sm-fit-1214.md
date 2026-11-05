---
'@hirobius/design-system': patch
---

SegmentedControl: the `sm` rail is 32px again, the same as Button `sm` (hds#1214). The 16px label's 24px line box made the 22px segment grow, so the rail was 34px. The `sm` label now uses the `lineHeight.none` line box. The selected `primary` label moves up 1px so it sits centered on the face above the 3px bottom edge, not low.
