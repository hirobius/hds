---
'@hirobius/design-system': patch
---

New type tokens, so Figma's text styles match code 1:1 (ADR-052 addendum):

- `semantic.typography.hero` (120px / 1.05 / Sora 700) and `primitive.typography.size.hero`: a marketing-only style above `display` for covers and marketing headers. `check-type-ramp` fails on `hero` inside `src/`.
- `semantic.typography.bodyStrong`: body at weight 700, what `<Text variant="body" weight="bold">` renders.
- `semantic.typography.uiItalic`: ui in italic, what EmptyState's inline message renders. Ships the new `--semantic-typography-uiItalic-font-style`.

Each ships as `--semantic-typography-<name>-*`, `hds.typeStyles.<name>` and the Figma text style `typography/<name>`.
