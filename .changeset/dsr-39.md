---
'@hirobius/design-system': patch
---

Dialog's slots stay in the manifest whichever regen runs last (hds#379). `pnpm tokens` used to drop the `trigger` slot from `componentSpecs.Dialog.slots` in `hds-manifest.json`, because the token build replaced the slot list that `pnpm manifest:generate` had merged from the component's `@slot` tags. The token build no longer writes slots, so both commands now leave the manifest byte-identical. Dialog's JSDoc also names the overlay, header, title, description, footer and close slots, so all eight appear in `component-api.json`, not only trigger and surface.
