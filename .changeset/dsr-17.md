---
'@hirobius/design-system': minor
---

`data-density="compact"` now remaps the spacing variables components actually read (`--semantic-space-scale-*`, plus surface padding and region gutter), so compact visibly tightens the default brand, and `Table` with no `density` prop follows the ancestor `data-density` attribute (an explicit prop still fixes it). Existing compact consumers will see tighter spacing.
