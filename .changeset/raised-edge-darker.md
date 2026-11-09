---
'@hirobius/design-system': minor
---

Raised Button edges are a darker step of the Button's own fill wherever a darker colour keeps the edge visible against that fill (hds#1399). Under a fill too dark for that (the light primary, and the dark danger, success, warning and info tones) the edge stays the lighter step it was, because black on a near-black fill reads flat. In dark, a 1px `semantic.color.border.default` page line (`--hds-edge-line`) sits under every raised Button edge, so the edge reads against the page.
