---
'@hirobius/design-system': patch
---

The interactive Card's hover lift and the Card.Progress fill now move on the productive motion token (hds#751). The lift dropped its raw 150ms; the fill dropped a JS duration with a bare `ease-out`, which prefers-reduced-motion could not reach. Both now stop under reduced motion.
