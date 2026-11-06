---
'@hirobius/design-system': patch
---

New component token `component.disclosure.paddingY` (hds#1147): the nav-variant Disclosure trigger reads its own token, `--component-disclosure-paddingY`, in place of the orphan `component.nav.paddingY`. Same value, so nothing renders differently. `component.nav.paddingY` is deprecated and goes in 1.0.0.
