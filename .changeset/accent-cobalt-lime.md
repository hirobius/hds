---
'@hirobius/design-system': patch
---

Accent options (Adrian, 2026-10-17). Graphite stays the default accent but is a touch lighter in light mode (`graphite.700` #433a3f → #4a4146, white text 9.83:1) and a touch softer in dark mode (`graphite.200` #d4d0d2 → #cbc6c9, on-accent text 9.02:1). New opt-in **cobalt** accent theme: set `data-accent="cobalt"` on `<html>` (or a wrapper) and only the accent tokens swap (accent `cobalt.600` #112de8 with white text 8.19:1, hover and pressed `cobalt.700`, subtle background `cobalt.50`, dark-mode accent `cobalt.300` #8a97f8 at 7.86:1 on black); the CSS ships in `accents.css`, already pulled in by the stylesheet. New **lime delight** accent `semantic.accent.delight.{base,deep,pale,onDelight}` (base #b8e62e, ink text 12.95:1) for delight moments only (streak or win badge, "new" tag, best-fit highlight, confetti), never buttons, links or focus. New primitives `primitive.color.cobalt.50–900` and `primitive.color.lime.*`.
