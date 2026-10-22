---
'@hirobius/design-system': minor
---

Overlays get a guaranteed edge (#893 review). Looks different, no code change needed.

- **Menu, Popover (and Combobox's listbox), Select listbox, Toast, Dialog, AlertDialog** draw a 1px `border.default` hairline (`border border-border`) on top of their shadow. Without it they had no edge over `surface.muted` (Tags, chips, the SegmentedControl track): the popover fill was the same colour (1.00:1) and a shadow cannot darken near-black in dark.
- **New `semantic.color.surface.floating`** (white in light, `neutral.800` in dark) is the overlay fill; `role.popover` (`bg-popover`, `--role-popover`) now points at it instead of `surface.overlay`, so overlays are white in light. `surface.overlay` itself is unchanged (badges, inline code, `bg-muted`).
- **Select listbox** uses `shadow-overlay` like Menu and Popover, not Tailwind's `shadow-md`.
- Separation floors, pinned by `overlay-edge.test.ts`: fill or hairline at least 1.15:1 against page, raised, muted and overlay surfaces in light (the soft shadow does the rest there) and 1.5:1 in dark (where the shadow cannot help).
