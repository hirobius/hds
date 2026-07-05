---
'@hirobius/design-system': minor
---

Add Tier-1 Radix-skinned interactive/overlay primitives closing the Astryx coverage gap (#76). Each wraps a Radix primitive themed with the HDS overlay role tokens (matching Menu/Dialog/HdsTooltip), adding these `@radix-ui` dependencies:

- **HdsToggleButton** (`@radix-ui/react-toggle`) — single two-state pressable button (`aria-pressed`).
- **HdsAlertDialog** (`@radix-ui/react-alert-dialog`) — modal confirmation dialog for destructive actions; Dialog-matched skin, no dismiss-on-outside-click.
- **HdsHoverCard** (`@radix-ui/react-hover-card`) — hover/focus preview card (not a substitute for an accessible tooltip).
- **HdsContextMenu** (`@radix-ui/react-context-menu`) — right-click menu sharing Menu's exact SURFACE/ITEM token skin.
- **HdsAspectRatio** (`@radix-ui/react-aspect-ratio`) — width:height ratio box that prevents media layout shift.

Each ships colocated tests (Radix jsdom polyfills), a Storybook story (overlays render closed on mount), a Code Connect stub, and a Swiss-canon fixture.
