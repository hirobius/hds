---
'@hirobius/design-system': minor
---

Button / IconButton: remove the deprecated `isDark` prop. Button chrome is
theme-aware via CSS variables, so the prop was a no-op. Remove it from call
sites.

Migration: `pnpm codemod -t codemods/remove-button-isdark.cjs <path>`
