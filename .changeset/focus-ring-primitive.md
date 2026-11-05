---
'@hirobius/design-system': patch
---

Button edge variables now alias `semantic.color.edge.*` tokens (same colours). `--semantic-focus-ring-color` now holds the accent border's primitive steps (graphite.700 light, graphite.300 dark) instead of aliasing `--semantic-color-border-accent`. Resolved colours do not change. The cobalt accent re-anchors the ring to its own accent border. If you set `--semantic-color-border-accent` yourself, also set `--semantic-focus-ring-color` to keep the ring on it.
