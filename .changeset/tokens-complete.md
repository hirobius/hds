---
'@hirobius/design-system': minor
---

Every spacing and radius value now has a semantic token, so no design needs a typed px value or a primitive step. New `semantic.space.fixed.*` steps fill the gaps between the comfortable scale rungs and do not move with density: `2xs` 4px, `xs` 12px, `sm` 16px, `md` 24px, `lg` 32px, `xl` 48px (sm–xl equal the compact scale rungs of the same name). New `semantic.radius.scale.*`: `sm` 8px, `md` 12px, `lg` 16px, `xl` 24px, `pill` (fully round), on two new primitives `primitive.radius.16` and `primitive.radius.24`. Each ships as a CSS var (`--semantic-space-fixed-sm`, `--semantic-radius-scale-md`), in `hds.semantic.*`, as Tailwind keys (`p-fixed-sm`, `rounded-scale-md`), as Figma variables, and as Box `sx` values (`p: 'fixed-sm'`, `borderRadius: 'pill'`).
