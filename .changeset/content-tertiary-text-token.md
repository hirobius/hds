---
'@hirobius/design-system': minor
---

New semantic text token `semantic.color.content.tertiary` (`--semantic-color-content-tertiary`), a third text level for small helper text that sits between `content.secondary` and `content.disabled` (hds#663). Light is `neutral.500` (4.7:1 on `surface.page`, 4.5:1 on `surface.raised`); Dark is the new primitive `neutral.450` (`#909090`, 6.6:1 on `surface.page`, 5.5:1 on `surface.raised`). Both themes and both surfaces are now gated in `check-contrast`. Consumers that reached for a primitive neutral to get a faint text colour can use the token instead.
