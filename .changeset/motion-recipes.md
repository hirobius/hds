---
'@hirobius/design-system': patch
---

Motion recipes (hds#751, ADR-065): `useMotionRecipe(name)`, `motionRecipe(name, { reduced })`, `MOTION_RECIPES` and `staggerDelay(index)`. Eleven named motions (`openDialog`, `openMenu`, `openTooltip`, `toast`, `reveal`, `swap`, `arrive`, `check`, `shake`, `expand`, `listItem`) built only from `hds.motion` tokens, to spread on a `motion.*` element. Each one has a reduced-motion version with no movement and no duration, which `useMotionRecipe` picks when the user asks for less motion.
