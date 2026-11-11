---
'@hirobius/design-system': minor
---

Sora replaces Plus Jakarta Sans across the whole type ramp. fonts.css now ships one self-hosted Sora variable file (wght 100-800, Latin subset, `font-display: swap`) and IBM Plex Mono 400; the Plus Jakarta Sans file and the static Sora 700 file are gone. The text weights are the static ones Figma's Sora ships, so code and Figma match: regular 400, semibold 600, bold 700, with `weight.medium` kept as a deprecated alias of regular (400); body, ui and caption take a new `primitive.typography.letterSpacing.text` (-0.01em). Both family stacks fall back to system-ui.
