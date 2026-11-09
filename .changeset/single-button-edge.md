---
'@hirobius/design-system': minor
---

Filled Buttons have one raised edge again, and the light primary is lighter (hds#1422). The 1px dark page line under every raised Button edge (`--hds-edge-line`, `--hds-edge-line-width`, from hds#1399) is gone, so dark Buttons no longer show a double bottom line. The light accent fill (`semantic.color.surface.accent`, `semantic.accent.rest`) is now `primitive.color.graphite.700` (was `graphite.950`), and the light primary edge (`semantic.color.edge.primary`) is one step darker, `#1f2532` (was `#000000`). In dark, the info fill (`semantic.color.feedback.bg.info`) is lifted to `blue.800` for page separation, and its edge (`semantic.color.edge.info`) is `blue.900` (was `neutral.black`). The computed Button edge floor is now 1.5:1 (was 2:1).
