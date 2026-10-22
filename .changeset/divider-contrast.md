---
'@hirobius/design-system': patch
---

Light-mode dividers read again (Adrian, 2026-10-22). Looks different, no code change needed.

- **`semantic.color.border.default`** (and `role.border`, `border-border`) Light: `neutral.200` #e5e5e5 → `graphite.200` #cbc6c9, warm graphite at 1.54–1.69:1 on page, raised, overlay, muted, floating and accentSubtle (was 1.15–1.26:1). Divider, `.hds-divider`, Table rows, MenuSeparator and overlay hairlines all draw it.
- **`semantic.color.border.strong`** Light: `neutral.300` #d4d4d4 → `graphite.300` #b2abae (2.05–2.25:1), so `Divider variant="strong"` and Kbd stay firmer than the default rule.
- **`semantic.color.border.subdued`** (deprecated) Light follows `border.default`, as its description promises.
- **MetadataList** row dividers use `border.default` instead of `border.subtle` (1.00:1 on muted).
- Dark mode unchanged (already 1.9:1 or more). Input borders (`border.interactive`) unchanged.
- Floor pinned by `divider-contrast.test.ts`: 1.45:1 light, 1.4:1 dark, on every surface a divider sits on.
