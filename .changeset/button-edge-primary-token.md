---
'@hirobius/design-system': patch
---

Add `semantic.color.edge.primary` and `component.button.edge.primary` (`--semantic-color-edge-primary`, `--component-button-edge-primary`): the primary Button's raised edge as a token, so the Figma variable `button/edge/primary` has a code source. `--hds-edge-primary` now reads `var(--component-button-edge-primary)` instead of a hard-coded hex; the colour does not change (#010207 light, #a5a6a9 dark). The token build fails if the token and the computed edge drift apart. Accents and tenants still override `--hds-edge-primary` with their own computed edge.
