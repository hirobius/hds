---
'@hirobius/design-system': patch
---

Components can state their accessibility contract as `@a11y <component|consumer> <required|recommended> [a11y:<id>|gate:<id>] <rule>` JSDoc tags (hds#520). `pnpm manifest:generate` writes them to `a11yRules` on the manifest spec and in `component-api.json`, each rule now carrying an optional `owner` (`component` or `consumer`) and `testId`. The MCP `get_component` answer gains an `a11y` list ("you: ..." for what the caller provides, "built in: ..." for what the component keeps), and the docs-site Accessibility fold splits into "You provide" and "Built in" for tagged components. Additive: no component changes yet.
