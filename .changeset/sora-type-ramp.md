---
'@hirobius/design-system': minor
---

Sora replaces Plus Jakarta Sans across the whole type ramp. fonts.css now ships one self-hosted Sora variable file (wght 100-800, Latin subset, `font-display: swap`) and IBM Plex Mono 400; the Plus Jakarta Sans file and the static Sora 700 file are gone. The text weights are re-tuned for Sora (regular 340, medium 430, semibold 510, bold 600) and body, ui and caption take a new `primitive.typography.letterSpacing.text` (-0.02em), so line length and visual weight stay close to before. Both family stacks fall back to system-ui.
