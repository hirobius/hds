---
'@hirobius/design-system': patch
---

Spacing: the 6px and 10px steps stay. `primitive.space.px6` / `px10` (`--primitive-space-px6` / `-px10`, `hds.space.px6` / `px10`, Tailwind `*-px6` / `*-px10`) are no longer deprecated and are not removed in 0.31.0, as 0.29.0 announced: open layouts need 6px and 10px gaps the 4px grid cannot hit. `hds/no-primitive-spacing` now reports them like any other primitive step (use a semantic token in components) instead of as a removed step, and `hds/no-deprecated-token` no longer lists them.
