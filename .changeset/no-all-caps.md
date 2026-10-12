---
'@hirobius/design-system': minor
---

The design system never produces ALL CAPS text. Avatar initials now show in the case of the name or the `initials` you pass instead of being forced to capitals, and Badge no longer reads a text-transform variable that no longer exists. The token `primitive.typography.letterSpacing.caps` (CSS variable `--primitive-typography-letterSpacing-caps`, Tailwind class `tracking-caps`) is removed, because its only job was to space out capitals. A Figma model build now refuses `textTransform: "uppercase"`. A new commit gate, `scripts/check-no-uppercase.mjs`, fails any uppercase class, `text-transform: uppercase`, `textCase: UPPER` or `.toUpperCase()` used for display.
