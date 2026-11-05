---
'@hirobius/design-system': patch
---

Light mode surface ladder re-spaced so cards read against the page (hds#522): `surface.raised` is now 1.2:1 on white (was 1.04:1), matching dark. Overlay, hover and muted step to the new `neutral.250` so Tag, the neutral Badge, InlineCode and tertiary hover still show on a card; sunken, pressed and soft move to `neutral.300`; selected and softHover move to the new `neutral.325`, so selected is no longer the same fill as sunken. To keep text and dividers legible on the darker steps, light `content.tertiary` moves to `neutral.550`, `border.default` to the new `graphite.250` and the secondary Button edge to `neutral.400`. Dark mode is unchanged. New primitives: `neutral.150`, `neutral.250`, `neutral.325`, `graphite.250`.
