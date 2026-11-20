---
'@hirobius/design-system': patch
---

Static `.hds-button` (static.css) now lifts to the 44px touch target on phones and coarse pointers, under the same `(max-width: 639px), (pointer: coarse)` query as the React Button's `.hds-touch-row`. A medium link or button in static markup grows from 40px to 44px there; `.hds-button--sm` keeps its extended hit area and `--lg` stays 48px. Desktop is unchanged. The upgrade ledger also fixes two 0.47.0 release-note slips: one Tag line was printed three times, and the `seg-edge-corners` note now counts as a look change.
