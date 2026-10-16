---
'@hirobius/design-system': patch
---

`src/styles/utilities.css` now sits inside `@layer utilities`. Its rules were unlayered, so they outranked Tailwind state variants of the same property (`cursor-pointer` beat `disabled:cursor-not-allowed` on Tag). Consumers who override these classes with unlayered CSS keep winning; nothing else changes.
