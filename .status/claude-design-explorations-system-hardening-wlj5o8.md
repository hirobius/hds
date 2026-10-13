Design explorations phase 0 (hds#628) integrated: spec set and gates (six briefs, invented fixtures, plugin-lint, axe, PII, gap aggregator) on the consistency harness; soft-demo and accent-pair-demo demo tenants; board and index generators (board reads the harness reports directory with --shots and hides a direction that failed its gates); the 21st MCP wired read-only. A dummy run (standing A, and B under soft-demo) passes every gate and renders a board.

@a11y JSDoc tags (hds#520 slice 0): owner/testId on a11yRules, reaches component-api.json, MCP get_component and the docs Accessibility fold; scripts/check-a11y-contracts.mjs registered at severity warn (pre-commit, lists every gap, exits 0) until the family backfills land.

Family A of the hds#520 a11y backfill (overlays, listboxes, announcements): @a11y tags on 12 components, overlay-a11y.contract.test.tsx, Combobox result-count live region.
