---
'@hirobius/design-system': patch
---

Delete dead internal (non-exported) files with zero consumers: `morph-card.tsx`,
`CascadeText.tsx`, `controls.tsx`. None were in `src/index.ts`'s public barrel
and none were imported anywhere in the repo — confirmed by grep before removal
(hds#133, Tier-1 zero-risk bucket, Adrian's option-A decision 2026-09-26).
