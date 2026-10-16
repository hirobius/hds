---
'@hirobius/design-system': patch
---

`src/styles/utilities.css` now sits inside `@layer utilities`. Its rules were unlayered, so they outranked Tailwind state variants of the same property (`cursor-pointer` beat `disabled:cursor-not-allowed` on Tag; `.flex` beat `empty:hidden`, so empty flex rows still took up their gap). The mono typography for `code`/`pre`/`kbd`/`samp` and `.font-mono` (plus `.font-normal`, `.tracking-wider`, `.tracking-widest`) moves to `mono-type.css` and stays unlayered, so code text keeps its HDS size over host-app layered styles. Consumers who override these classes with unlayered CSS keep winning.
