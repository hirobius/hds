---
'@hirobius/design-system': patch
---

Badge is a step taller (22px, was 20px), its label sits optically centred (a new `component.badge.labelOffset` lifts it 1px), and its corner is 6px, one step under the 8px action radius, through `component.badge.radius` instead of the shared `rounded-md` (hds#757). New primitives `primitive.size.22` and `primitive.radius.6` back them. A tenant that squared everything with `role.radius` now also sets `component.badge.radius` (brutalist-demo does).
