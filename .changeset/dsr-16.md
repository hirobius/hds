---
'@hirobius/design-system': minor
---

Portalled overlays (Dialog, AlertDialog, Menu, ContextMenu, Popover, Select, HoverCard, Tooltip, Lightbox and the image-expand cursor pill) now mount inside the nearest `data-hds` scope instead of `document.body`, so `<div data-hds data-theme="dark">` themes them. Each Content part gains an optional `container` prop to override the target. The modal scrim uses the new theme-aware `semantic.color.surface.scrim` token (`role.scrim`, `bg-scrim/60`), which is black in dark mode instead of a white wash, and the dark theme now declares `color-scheme: dark`.
