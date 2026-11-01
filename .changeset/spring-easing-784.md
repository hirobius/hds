---
'@hirobius/design-system': patch
---

Fix: `--primitive-easing-elastic` was `spring(300, 20, 1)`, which is not CSS, so `--hds-motion-expressive-easing` and the `--hds-anim-appear`, `--hds-anim-entrance` and `--hds-anim-spin` presets were invalid wherever used (hds#784). The spring now ships as a `linear()` curve sampled from the same stiffness, damping and mass: it overshoots once by about 11% and settles. The token build fails if an easing token is not a valid CSS easing.
