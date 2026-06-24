---
'@hirobius/design-system': minor
---

SegmentedControl: move `size` onto the shared `sm | md | lg` ramp used by
Button/Input/IconButton. `size="default"` → `size="md"`, `size="compact"` →
`size="sm"`. Rendering is unchanged.

Migration: `pnpm codemod -t codemods/segmentedcontrol-size.cjs <path>`
