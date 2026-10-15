---
'@hirobius/design-system': patch
---

Motion recipes (hds#751): `useMotionRecipe(name)`, `motionRecipe(name, { reduced })`, `MOTION_RECIPES` and `staggerDelay(i)`. Eleven named motions (`openDialog`, `openMenu`, `openTooltip`, `toast`, `reveal`, `swap`, `arrive`, `check`, `shake`, `expand`, `listItem`) built from `hds.motion` tokens; spread one on a `motion.*` element. Under reduced motion each becomes still (no movement, no duration). Also `hds.motion.distance` and `hds.motion.blur`. The Motion docs page is rebuilt around them with a live demo.
