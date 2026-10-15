---
'@hirobius/design-system': patch
---

Box `sx` responsive values take an explicit `base` key: `{ flexDirection: { base: 'column', sm: 'row' } }` compiles `base` to a plain rule with no media query, so it applies at every width, including below the `xs` breakpoint (375px). `xs` keeps its existing meaning.
