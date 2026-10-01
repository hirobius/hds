---
'@hirobius/design-system': patch
---

`pnpm check:full` passes its token-tier, motion, security-baseline and migration-log gates again (hds#403).

- Two new tokens: `primitive.size.120` (120px, `--primitive-size-120`) and `semantic.size.tile` (`--semantic-size-tile`, aliasing it). `MetricTile` takes its min-height from `--semantic-size-tile` instead of `calc(var(--primitive-size-96) + var(--primitive-size-24))`. Same 120px, so no tile changes size; the tile height is now one token a theme can override.
- `StackedCardRail` still injects its CSS as an HTML string (the hds#284 SSR fix), now annotated `security-ok` with the reason, and a new test fails if any card data (title, category, href, image) ever reaches that string. No rendered output changes.
- `TOKEN_MIGRATION.md` now records the six primitive typography tokens removed on 2026-09-24 (`size.2xs`, `weight.light`, `weight.semibold`, `letterSpacing.tighter`, `.wide`, `.wider`), each with its nearest surviving step.
- `Table`'s sortable header button now has hover feedback: its label and sort glyph ease to the muted foreground (`hover:text-muted-foreground`) over the productive motion token (`--hds-motion-productive-duration`, 150ms, zeroed under `prefers-reduced-motion`). Before, hovering a sortable header changed nothing. The resting header is unchanged.
