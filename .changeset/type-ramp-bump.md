---
'@hirobius/design-system': minor
---

Bumps the small end of the type ramp (Adrian, 2026-10-15). `body` goes 16px to 18px (line height 1.6, so 25.6px to 28.8px), `ui` 14px to 16px (21px to 24px), `caption` 12px to 14px (18px to 21px), `titleSm` 16px to 18px and `mono` 13px to 15px (the `primitive.typography.size.code` value). `display` and `title` are unchanged. The deprecated `eyebrow` follows `caption`, and the Button (sm 14px, md and lg 16px), Badge and Tag label sizes follow their roles. Only values move: no token is added or removed, and the spacing scale and density modes are untouched. Text-bearing components get taller by the extra line height, so check fixed-width layouts and wrapping.
