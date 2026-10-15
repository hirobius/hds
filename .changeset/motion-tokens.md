---
'@hirobius/design-system': patch
---

Motion tokens (hds#751): six springs (`primitive.easing.spatialFast|spatialDefault|spatialSlow|effectsFast|effectsDefault|effectsSlow`), `primitive.duration.stagger` (40ms) and `extended` (600ms), `primitive.blur.2|4`, `primitive.scale.96|97|98`, and `semantic.motion.nudge|slide|blurSwap|blurReveal|scaleDialog|scaleMenu|scaleTooltip`. JS: `hds.motion.springs`, `hds.motion.stagger`, `hds.motion.extended`, `hds.motion.scale`.

Fix: spring easings (`--primitive-easing-elastic`, so `--hds-motion-expressive-easing` and the `--hds-anim-*` shorthands) compiled to `spring(…)`, which is not CSS, so declarations using them were dropped. They are now `linear()` curves sampled from the same spring.
