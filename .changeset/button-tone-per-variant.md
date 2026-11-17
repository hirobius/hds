---
'@hirobius/design-system': minor
---

Button status tones (`danger`, `success`, `warning`, `info`) now follow the variant's emphasis. Primary keeps the solid feedback fill, its page-colour label and its tone edge (`component.button.edge.<tone>`). Secondary is the soft `feedback.bg` tint with the `content.primary` label (no coloured text on a soft tint), held on hover and press, and sits flat, with no edge. Tertiary takes the feedback text colour on a clear face; the hover wipe paints the same tint, where the label stays at 4.5:1 or more, and it never takes the grey hover fill, where the label would fall under AA. Link is unchanged. No prop changes.
