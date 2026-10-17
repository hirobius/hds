---
'@hirobius/design-system': minor
---

Radius scales with the element, and theme switches are instant (job-hunt feedback, 2026-10-17). Every surface now takes the Card radius (`rounded-lg`, 12px by default, follows `role.radius`): `Callout`, `Alert`, `Popover`, `Menu`, the `Select` listbox, `Toast` and the block `CodeBlock` move up from 8px, and menu and select items step to `rounded-md` so their corners stay concentric. New token `semantic.radius.surface` (`--semantic-radius-surface`, 12px) names the step; `component.card.radius` now aliases it (same value). The universal 300ms background, text and border colour transition on every element under `[data-hds]` is gone: a light/dark swap repaints at once, and `ThemeProvider` and `HdsThemeProvider` set `data-theme-switching` on the theme root for one frame so components' own colour transitions do not fade the swap either. Elements that relied on that universal rule for a hover fade now change colour instantly.
