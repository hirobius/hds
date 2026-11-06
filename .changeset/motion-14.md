---
'@hirobius/design-system': minor
---

Motion (the animation engine) is now 14.3.1, up from 12.23.24 (hds#751). Breaking for apps that import `motion` themselves: move it to 14.x so both use one copy, and so Motion types in HDS exports (such as `MotionValue` from `./scroll`, and the recipes) match yours. Button's toggle-label crossfade now uses Motion's `m` with `LazyMotion` (`domAnimation`), so a Button-only import is smaller (74.3 kB to 66.3 kB gzip in the probe).
