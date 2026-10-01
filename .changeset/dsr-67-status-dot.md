---
'@hirobius/design-system': minor
---

**`StatusDot` is deprecated for `<Badge dot>`, and `StatusDotProps` for `BadgeProps`; both are removed in 0.21.0 (hds#395).** `tone`, `size` and `label` map one to one, and so does the dot; a development build logs one `[HDS deprecation]` warning. It stays in 0.20.0 because ops passes it a `style`, which Badge (className-only) does not take, so no codemod can rewrite that site: move the `style` to a wrapper or a `className` first (MIGRATIONS.md, "StatusDot is deprecated").
