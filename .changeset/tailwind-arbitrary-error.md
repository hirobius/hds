---
'@hirobius/design-system': patch
---

Surface's `item`, `px16` and `px24` padding now read the `--primitive-space-4` / `--primitive-space-6` tokens instead of literal `16px` / `24px`; the rendered padding is identical. The repo's `tailwindcss/no-arbitrary-value` lint rule is now an error, so a literal arbitrary value can no longer land in a component.
