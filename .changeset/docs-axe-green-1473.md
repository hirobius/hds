---
'@hirobius/design-system': patch
---

Dark info text now clears AA on its own fill: `semantic.color.feedback.info` moves from blue.300 to blue.200 in dark (3.9:1 to 9.5:1 on the info badge fill), and `check:contrast` reads the oklch blue ramp and holds every feedback tone to AA on its badge fill (hds#1473). The docs site footer says "HDS", so the home page names the system once, and the motion sample uses `content.onAccent` on its accent fill.
