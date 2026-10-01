---
'@hirobius/design-system': minor
---

Popover, Tooltip and HdsRouterProvider now say when to use them (hds#393).

- `Popover` and `Tooltip` carry the usage contract in `public/hds-manifest.json` (`usage.when`, `usage.whenNot`, `usage.useInstead`, `keyboard`) and appear in the "Which one when" section of `public/llms.txt`. Their `keyboard` entries list only what the keyboard contract test drives: Popover opens on Enter or Space, closes on Escape and loops Tab inside; Tooltip opens on focus, closes on Escape and closes when Tab moves on.
- `Tooltip` casts `shadow-floating` (`semantic.elevation.floating`, the popover and dropdown shadow) instead of `shadow-overlay`, which is for dialogs and sheets. Its colours, radius and caption text are unchanged.
- `Tooltip` links Figma node 93:15 (`figmaUrl` in the manifest, `docs/DESIGN_LINKS.md`, and the Design tab of its Storybook stories), so every published Figma component now maps to code (51 of 51).
- `HdsRouterProvider` has a manifest spec (category Theming, tier primitive, doc-exempt), so the manifest lists 147 components instead of 146. Nothing about its API changes.
