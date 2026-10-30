---
'@hirobius/design-system': minor
---

Raise the `react-router` peer floor to `^7.18.2` (hds#970). Older 7.x releases carry XSS, open-redirect, CSRF and RCE advisories, and the old `^7.0.0` range let a consumer sit on them without a warning. The dev pin moves to 7.18.5.
