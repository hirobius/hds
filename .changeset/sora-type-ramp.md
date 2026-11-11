---
'@hirobius/design-system': minor
---

Sora replaces Plus Jakarta Sans across the whole type ramp. fonts.css now ships one self-hosted Sora variable file (wght 100-800, Latin subset, `font-display: swap`) and IBM Plex Mono 400; the Plus Jakarta Sans file and the static Sora 700 file are gone. The text weights use Sora's named Figma styles only, so Figma and code match exactly: regular 400, semibold 600 and bold 700. Sora has no Medium in Figma, so `weight.medium` becomes a deprecated alias of `weight.regular` (400, was 500). Body, ui and caption take a new `primitive.typography.letterSpacing.text` (-0.01em), so line length stays close to before. Both family stacks fall back to system-ui.
