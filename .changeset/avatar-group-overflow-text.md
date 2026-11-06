---
'@hirobius/design-system': patch
---

`AvatarGroup`: screen readers now read the overflow chip as "+2 more". The chip used an `aria-label` on a plain span, which assistive tech does not reliably announce. It looks the same.
