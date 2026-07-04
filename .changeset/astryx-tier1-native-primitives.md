---
'@hirobius/design-system': minor
---

Add Tier-1 native primitives closing the Astryx coverage gap (#76), with zero new runtime dependencies:

- **Kbd** — inline keyboard key / shortcut hint (`<kbd>`).
- **StatusDot** — compact solid status indicator with semantic tones.
- **Timestamp** — semantic `<time>` with date/time/datetime/relative formatting.
- **Blockquote** — quoted passage with optional attribution.
- **VisuallyHidden** — screen-reader-only content (`sr-only`), polymorphic `as`.
- **AvatarGroup** — overlapping avatar cluster with a `+N` overflow chip.
- **ButtonGroup** — attaches Button children into one segmented control.
- **InputGroup** — text input framed with leading/trailing adornments.
- **CircularProgress** — SVG progress ring (determinate + indeterminate).

Each ships with tokens-only styling, colocated tests, a Storybook story, a Code Connect stub, and a Swiss-canon fixture.
