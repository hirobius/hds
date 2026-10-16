---
'@hirobius/design-system': patch
---

Dark `--semantic-accent-pressed` moves from graphite-400 to graphite-100, so `content-onAccent` on the pressed accent is 12.3:1 (was 4.17:1, under AA). Pressed stays distinct from hover (graphite-300). Contrast gate now covers onAccent on accent rest, hover and pressed. Consumers can drop any held floor on this pair (hds#748).
