---
'@hirobius/design-system': patch
---

Card gains a row slot for a titled status: `Card.Row` (a `trailing` zone for a Badge or one affordance), `Card.RowTitle` (the title, at the ui role) and `Card.RowNote` (a muted caption line; repeat it), also exported as `CardRow`, `CardRowTitle` and `CardRowNote`. `StatusTile` is deprecated (removed in 1.0.0) and renders as before; `<Card padding="item" className="border-0">` around a `Card.Row` renders the same tile (hds#622).
