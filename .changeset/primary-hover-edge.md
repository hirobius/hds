---
'@hirobius/design-system': patch
---

Button: a hovered `primary` Button now sits on an edge made from its hover fill (`--hds-edge-primaryHover`, from `semantic.accent.hover`), not from its resting fill. Before, an accent such as cobalt showed a hover edge in a different hue (dark) or an edge that almost disappeared (light). The new edge keeps the same contrast floor as the primary edge. Accents and tenants compute their own hover edge.
