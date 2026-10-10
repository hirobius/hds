---
'@hirobius/design-system': patch
---

fix(feedback): unify Alert + Callout on one tinted-fill tone language.

The two feedback components carried tone in opposite ways — Alert by a tinted fill (`bg-feedback-bg-*`), Callout by a 3px colored left stripe — reading as two systems, and the stripe was the lone >1px colored side-rule anti-pattern left in the set. DESIGN.md also still claimed Alert carries tone "by left-border color, not by tinted fills", which the shipped Alert already contradicted.

- **Callout** now uses the same tinted feedback fill as Alert (rounded, no stripe); `accent` (not a feedback state) takes a neutral `bg-muted` fill. It stays distinct from Alert by role — no icon, no status role, optional `italic` — not by mechanism.
- **Alert** unchanged (already fill-based).
- **DESIGN.md** (via build-design-md.mjs) corrected: tone is carried by a tinted feedback fill, not a left-border stripe.

Visual change to Callout; no API change.
