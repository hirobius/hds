---
'@hirobius/design-system': minor
---

Card gains the entity card parts: `Card.Source` (an `Avatar` size `sm`, a name and a `Timestamp` on one row) and `Card.Facts` (a wrapping caption row of 16px decorative icons with a text label each, rendered as a list). Use them with `Card.Header`, `Card.Title` and `Card.Footer` for a job, lead or listing card. `MapPin` and `Banknote` join `@hirobius/design-system/icons`.

Avatar: an empty `alt` now hides its initials from assistive tech (as its icon already did), so an avatar beside a visible name, as in `Card.Source`, is decorative instead of an unnamed image.
