---
'@hirobius/design-system': patch
---

`hirobius.tokens.json` now passes a strict W3C DTCG check. `component.tag.lineHeight` is typed `number`, matching the token it aliases, which also fixes `--component-tag-lineHeight` in `dist/hds-tokens.css` (it was `undefinedundefined`, now `1.5`). The three HDS composites DTCG has no type for moved under `$extensions["com.hirobius.hds"]`: `semantic.motion` is a DTCG `transition` group (0ms delay), `primitive.easing.elastic` is a `cubicBezier` token whose spring parameters sit in the extension, and each `semantic.elevation` level keeps its surface, shadow and border there. Generated CSS variables, TypeScript and Figma variables are unchanged. Code that reads the raw JSON export and looked for `$type` `motion`, `spring` or `elevation` should read the extension instead.
