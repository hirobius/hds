---
'@hirobius/design-system': patch
---

Dark accent states now lighten step by step: `--semantic-accent-hover` moves from graphite-300 to graphite-100 and `--semantic-accent-pressed` from graphite-400 to graphite-50 (rest stays graphite-200). `content-onAccent` contrast is 10.0 rest, 12.3 hover, 13.8 pressed (pressed was 4.17:1, under AA). Light mode is unchanged. Contrast gate now covers onAccent on accent rest, hover and pressed. Consumers can drop any held floor on this pair (hds#748).
