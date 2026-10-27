---
'@hirobius/design-system': patch
---

Badge is a step taller (22px, was 20px), its label sits optically centred (a new `component.badge.paddingShift` moves 1px of its vertical padding from top to bottom, which centres the x-height of a sentence-case label), and its corner is 6px, one step under the 8px action radius (`rounded-sm`, `role.radius` minus 2px, so a tenant still reshapes it; `component.badge.radius` records the 6px for Figma; the static `.hds-badge` matches) (hds#757). New primitives `primitive.size.22` and `primitive.radius.6` back them.
