---
'@hirobius/design-system': minor
---

`npx @hirobius/design-system upgrade` runs the new `hds-deprecated-tokens` codemod. It rewrites every deprecated token that names a single replacement, as a CSS var (`var(--semantic-space-layout-tight)` → `var(--semantic-space-scale-sm)`), an `hds.*` member, a `{…}` DTCG reference or a Tailwind key (`p-layout-tight` → `p-scale-sm`). It leaves var declarations alone, and it lists what it cannot spell, such as `semantic.space.sidebar.railWidth` → `primitive.size.width.280`, for you to change by hand. The deprecated tokens it rewrites are removed in 1.0.0.
