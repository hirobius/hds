---
'@hirobius/design-system': patch
---

New `--primitive-typography-weight-mono` (400). The mono role's font weight now follows it instead of `weight.regular` (450). With the shipped IBM Plex Mono (400 only) nothing renders differently. If you set `--hds-font-family-mono` to a mono font that has a 450 weight, mono text now renders at 400; set `--primitive-typography-weight-mono` to change it.
