---
'@hirobius/design-system': patch
---

Relocate the docs-tooling bucket (hds#133 ISSUE-09, Adrian's option-A decision:
delete/relocate only non-exported internals, keep every exported component) out
of `src/app/components/` into `src/docs-tooling/`: `api-reference`,
`component-preview`, `controls-panel`, `demo-block`, `doc-page-header`
(+ its test), `health-rail`, `page-footer`, `preview-frame`, `propTableUtils`,
`shell-controls`, `sketch-controls`, `theme-toggle`, `variant-strip`,
`DocPageSpec`, `TokenDisplayToggle`. None were exported from `src/index.ts` or
`src/patterns.ts`, so this is a zero-risk, non-breaking move — only internal
relative import paths changed. `pnpm manifest:generate` now correctly drops
these from `public/hds-manifest.json` (component-discovery only scans
`src/app/components/`), which is the intended effect: they were never
consumer-facing. `lab/*` relocation stays remaining — its earlier blocker
(extracting `lab/tokenUtils.ts` from the public `Token` primitive) was already
resolved in hds#233/369dce5; the file lives at `src/app/components/tokenUtils.ts`
now.
