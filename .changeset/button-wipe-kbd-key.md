---
'@hirobius/design-system': minor
---

Button: opt-in `hoverEffect="wipe"` (default `none`, existing buttons unchanged). The variant's own hover fill slides in from the edge the pointer enters and out the edge it leaves, hard-edged; keyboard focus fills left to right. Hover-capable pointers only, instant under `prefers-reduced-motion`, nothing on a disabled button. Kbd: its key edge is now the `--semantic-shadow-key` custom property (same 2px `border.strong` drop as before), so a hard-shadow theme can follow the Button light source in one place.
