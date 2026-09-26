---
'@hirobius/design-system': patch
---

Delete the dead `componentPreviewRegistry` island: `componentPreviewRegistry.tsx`,
`specimen-block.tsx`, `variant-preview-deck.tsx` (~900 lines). None were exported
from `src/index.ts`'s public barrel, none were imported outside this trio, and
knip flagged all three as unused — the remains of the docs SPA deleted in #90.
The Storybook-built component reference site (#280) replaces what this was
reaching for; its hand-written `DEFAULT_PREVIEW_PROPS` table had decayed to 46
entries covering 30 of 139 manifest components. Decision and the pattern worth
keeping (`import.meta.glob` module discovery + manifest-driven
`preview.exportName`/`preview.sizing`) recorded in `DECISIONS.md` (hds#286,
Adrian's decision 2026-09-26).
