---
'@hirobius/design-system': minor
---

Table: `TableColumn` gains optional `sortable`, `sortDirection` (`'ascending' | 'descending' | 'none'`), and `onSort`. Sortable columns render a real button inside the header cell, set `aria-sort` on the header cell, and show a token-sized direction glyph (ArrowUp/ArrowDown/ArrowUpDown). Non-sortable columns render exactly as before (pixel parity).
