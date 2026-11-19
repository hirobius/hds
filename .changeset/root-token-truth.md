---
'@hirobius/design-system': patch
---

One winner per spacing token: `semantic.space.section.inset` is now 128px (80px below 640px), `semantic.space.sidebar.gap`/`sectionGap`/`railPadding` 20/16/24px and `semantic.layout.grid.gap` scale.md in the token source, matching what styles.css already rendered. theme.css no longer re-declares them, so tokens.css, styles.css and variables.css agree and a lazily loaded styles.css no longer shifts the layout. A new check fails on a hand-written `:root` that overrides a generated token.
