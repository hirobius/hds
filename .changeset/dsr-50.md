---
'@hirobius/design-system': patch
---

`pnpm check:full` gets past its security-baseline gate (hds#403). `StackedCardRail` still injects its CSS as an HTML string (the hds#284 SSR fix), now annotated `security-ok` with the reason, and a new test fails if any card data (title, category, href, image) ever reaches that string. No rendered output changes.
