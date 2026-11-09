---
'@hirobius/design-system': minor
---

Raised Button edges are always a darker step of the Button's own fill, in both themes (hds#1399). The light primary edge is now `#000000` (it was a lighter `#424a56` lip). In dark, the danger, success, warning and info edges are `primitive.color.neutral.black`, and a 1px `semantic.color.border.default` page line (`--hds-edge-line`) sits under every raised Button edge, so the edge reads against the page.
