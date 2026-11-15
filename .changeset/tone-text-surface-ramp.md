---
'@hirobius/design-system': minor
---

Tone labels use the plain content colour. Badge tones and toned Buttons (danger, success, warning, info) now set their label in `content.primary`, and the tone shows through the fill, edge and icon. A toned `variant="link"` keeps the feedback colour, because it has no fill. The surface ramp is retuned (Option A): the dark page, raised, overlay, muted and selected surfaces sit one step lighter; the light secondary and tertiary Button fills sit one step deeper; tone fills (`feedback.bg.*`) are stronger in both themes; and the dark Button edge, interactive border and default border are lighter so they still pass 3:1.
