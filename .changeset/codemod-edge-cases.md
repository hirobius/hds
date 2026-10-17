---
'@hirobius/design-system': patch
---

Fix codemod edge cases in patterns-subpath and tile-grid: preserve comments outside braces, handle ES2022 string specifiers, strip block comment indents, avoid doubling parentheses on expression widths, and fix nullishness classification for expressions like `w ?? undefined`.
