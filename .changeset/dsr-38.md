---
'@hirobius/design-system': patch
---

`Button` and `Card` no longer use the Tailwind important modifier (`!`) for `tone` (hds#372, ADR-030). A status tone now wins over `variant` the way every other class override does, by tailwind-merge class-group replacement: Button's tone strings also set the hover fill and hover border, so no variant hover colour leaks through, and Card's tone sets `border` plus the feedback colour, replacing `accent`'s `border-2`. No visual change in any variant, tone, state (`iconOnly`, a toggle on or off, a selectable or selected Card) or theme; a toned toggle keeps the tone colours when on, as before. One behaviour change: a consumer `className` can now override a tone's colours the same way it already overrides a variant's (before, `!` made tone colours unoverridable), which is the documented escape-hatch model.
