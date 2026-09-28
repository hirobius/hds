---
'@hirobius/design-system': patch
---

Relocate the internal token-lab views (hds#133, Adrian's option-A decision) from
`src/app/components/lab/` to `src/docs-tooling/lab/`: `legacy-token-detail`,
`legacy-token-list`, `token-collection-list`, `token-list`. None were exported
from `src/index.ts` or `src/patterns.ts`, and the shared `tokenUtils` module the
public `Token` primitive depends on already lives outside `lab/`
(`src/app/components/tokenUtils.ts`, hds#233), so no exported component is
removed or renamed and the published package is unchanged. A new
docs-tooling boundary test keeps lab modules out of the component tree.
