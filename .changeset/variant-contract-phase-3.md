---
'@hirobius/design-system': minor
---

Variant contract (#60, Phase 3): convert className-based composites/overlays to `cva`. New cva adopters: `Card`, `Breadcrumb`, `Carousel`, `CommandPalette` (coverage: 35/123, was 31/123). `AlertDialog`, `Dialog`, `Tabs`, `Menu`, `ContextMenu`, `HoverCard`, `Popover`, `HdsTooltip` were reviewed and have no prop-driven className branching to formalize (their Radix `data-[state=…]` styling already lives directly in a single class string, contract-compliant as-is) — skipped, nothing to convert. `AspectRatio` has no className surface at all (thin Radix passthrough). The legacy `Tooltip` (image-expand pill) is CSS-in-JS/`framer-motion`-driven — flagged for a future inline-style→Tailwind migration before it can adopt `cva`. `ToggleButton` was already cva-converted in an earlier phase.

Breaking (value rename): `Card`'s single `tone` prop is now two axes — `variant` (`'default' | 'accent'`, the former structural values) and `tone` (fixed `neutral | danger | success | warning | info`). Migrate:

- `<Card tone="default">` → `<Card variant="default">` (or omit both — same default)
- `<Card tone="accent">` → `<Card variant="accent">`
- `<Card tone="success" | "warning" | "danger">` → unchanged (still valid on `tone`)

`Card.Progress` and `Card.Metric`'s `tone` prop drops the `'accent'` value (no known internal consumers) and renames `'default'` → `'neutral'` (same default rendering — content-accent fill for Progress, content-primary color for Metric). Both gain a new `'info'` tone value for fixed-vocab completeness.
