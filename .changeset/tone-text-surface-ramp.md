---
'@hirobius/design-system': minor
---

Toned Buttons (danger, success, warning, info) are solid mid-tone fills with a knock-out label in the page colour: white in light, near-black in dark. Each face clears 3:1 against the page and a raised surface. Each edge is its fill one OKLCH step darker, the same drop as the Secondary edge, and there is no stroke. A toned `variant="link"` keeps its feedback text colour. Alert and Badge stay soft tints, and Badge tone labels now use `content.primary`. A new `semantic.color.feedback.solid.warning` gives the warning fill an amber that does not read brown.

Dark surfaces are lifted: page 850, raised 750, overlay and muted `neutral.740`, sunken `neutral.675`, and dark `content.tertiary` 400. In light, the secondary Button fill moves to the new `surface.softStrong` (350, hover 325), the tertiary hover moves to 325, and tone tints (`feedback.bg.*`) are stronger. Dark Button edges and borders are lighter so they keep 3:1.
