---
'@hirobius/design-system': minor
---

Graphite and neutral lean toward a midnight hue (OKLCH hue 262), so the near-monochrome base reads cool instead of flat grey (hds#755). Every step keeps its lightness: graphite chroma is 0.036 × a per-step weight, neutral chroma is 0.022 × min(1, max(0.12, 1 − L) × 1.25). `neutral.white` stays `#ffffff`; `neutral.black` becomes `#060a13` (oklch 0.145 0.022 262), so the dark page is midnight, not pure black. Lifting black would have dropped the dark card and muted fills under their distinctness floors, so three new tinted steps take those slots: `primitive.color.neutral.825` (dark `surface.raised`), `primitive.color.neutral.750` (dark `surface.muted`) and `primitive.color.neutral.725` (dark `surface.selected`, the active tab). No AA contrast pair changes pass or fail; dark ratios against the page drop slightly (content.primary 19.3 → 18.2:1) because the page is no longer pure black, and `neutral.950` now equals `neutral.black`.
