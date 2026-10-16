---
'@hirobius/design-system': minor
---

Badge is a touch taller (20px to 22px), its label is lifted so cap height is optically centred (new `component.badge.labelOffset`, 2px extra bottom padding), and its corner radius is `component.badge.radius`, now 4px (was the 8px action radius). The Badge reads its radius from that token, so a tenant reshapes it by overriding `--component-badge-radius`. Adds `primitive.size.22`.
