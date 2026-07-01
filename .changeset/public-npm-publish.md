---
'@hirobius/design-system': patch
---

Publish to the **public npm registry** instead of GitHub Packages. Consumers now
install with a plain `npm install @hirobius/design-system` — no `.npmrc`, no auth
token, and no registry configuration. The package `exports`, build output, styles,
and API are unchanged; only the distribution target moved.
