---
'@hirobius/design-system': patch
---

Sixteen `component.*` tokens now hold the value their component already renders, so Figma and the code agree (hds#595, "code wins"). Button: `paddingY` and `size.md.paddingY` are 8px (were 12px), `size.sm.paddingX` 12px (was 8px), `size.sm.height` 32px (was 28px), `size.sm.itemSpacing` 8px (was 4px), `size.lg.fontSize` 14px (was 16px), `secondary.bg.hover` is `surface.accentSubtle`, `secondary.border.hover` and `.pressed` are `border.accent`, and `secondary.border.disabled` is `border.interactive`. Card: `radius` 12px (was 8px), `gap` 16px (was 8px). Input: `bg` is `surface.page` and `paddingX` 12px (was 16px). Tag: `background` is `surface.raised` and `text` `content.secondary`. The React components already rendered these values, so nothing changes on screen; only the token values (and the CSS variables built from them) move.
