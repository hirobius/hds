---
'@hirobius/design-system': minor
---

InlineLink: a `size` prop (`sm` = ui, `md` = body, `lg` = title) for links that stand larger than running text, such as on a cover. Leave it unset and the link inherits the surrounding type, as before. The external-link icon is now sized and spaced in em (`component.inlineLink.iconSize` 0.75em, `iconGap` 0.25em, from the new `primitive.inlineIcon.*`), so it scales with the text at any font size; in 16px text it draws 12px with a 4px gap, where it was a fixed 11px.
