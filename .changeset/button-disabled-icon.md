---
'@hirobius/design-system': patch
---

A disabled primary Button now reads as a neutral muted button in light and dark: `component.button.primary.bgDisabled` points at `semantic.color.surface.muted` and `textDisabled` at `semantic.color.content.disabled` (they were `accentSubtle` and `onAccent`, which assumed a coloured accent), and Button binds those tokens. The small Button's icon is 12px, as its `component.button.size.sm.iconSize` token says (it was 14px); medium and large are unchanged at 16px and 20px.
