---
'@hirobius/design-system': patch
---

Fills that blended in now show (hds#522). Avatar, the AvatarGroup `+N` bubble, Kbd and Callout `tone="accent"` fill with `surface.sunken`: their `bg-muted` fill was 1.04:1 on a raised Card in light (now 1.21:1; initials and key legends keep 6.2:1 light, 5.0:1 dark). The active Tab and its `panel` content fill with `surface.selected`: the `bg-accent/5` tint was near-invisible in both themes (now 1.26:1 on the light page, 1.39:1 on the dark one).
