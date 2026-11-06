---
'@hirobius/design-system': patch
---

CodeBlock's copy icon now pops in (fade and scale) when it swaps to the check and back, on `--hds-anim-appear`: the productive motion duration with the expressive easing (hds#751). The new `.hds-icon-swap` class in theme.css drives it; reduced motion drops the animation.
