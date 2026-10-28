---
'@hirobius/design-system': minor
---

Graphite and neutral lean toward a midnight hue (OKLCH hue 262), so the near-monochrome base reads cool instead of flat grey (hds#755). Every step keeps its lightness: graphite chroma is 0.036 × a per-step weight, neutral chroma is 0.022 × min(1, max(0.12, 1 − L) × 1.25). `neutral.white` stays `#ffffff`; `neutral.black` becomes `#060a13` (oklch 0.145 0.022 262), so the dark page is midnight, not pure black. Lifting black would have dropped the dark card and muted fills under their distinctness floors, so two new tinted steps take those slots: `primitive.color.neutral.825` (dark `surface.raised`) and `primitive.color.neutral.750` (dark `surface.muted`). No AA contrast pair changes pass or fail.
