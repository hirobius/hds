---
'@hirobius/design-system': minor
---

Component contract tags reach the generated files (hds#339). `@usage`, `@whenNot`, `@useInstead`, `@slot`, `@keyboard` and `@ai-rules` in a component's JSDoc are parsed into `usage`, `slots`, `keyboard` and `aiRules` on each spec in `public/hds-manifest.json` and `component-api.json`, and into a "Which one when" section of `llms.txt`; tag text no longer leaks into `description`. The agent manifest keeps `a11yRules`. In development, `<Button iconOnly>` with no `iconLeft` now warns once instead of rendering an empty square.
