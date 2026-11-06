---
'@hirobius/design-system': patch
---

Opt-in fluid display size (hds#1300): `--semantic-typography-display-font-size-fluid` is `clamp(40px, 1.6rem + 4vw, <display size>)`, from 40px at a 360px viewport to the full 56px at 760px. Set it as `font-size` on a hero that must fit a phone, in place of a hand-rolled clamp. The display size itself (`--semantic-typography-display-font-size`, 56px) does not change. New tokens: `primitive.typography.size.displayMin` (40px) and the optional `fontSizeMin` key on `semantic.typography.display`.
