---
'@hirobius/design-system': minor
---

New `CommandPalette`: a ⌘K / Ctrl+K search and command box built on Dialog and Kbd. Pass `items` (label, optional `group`, `keywords`, `shortcut` keys, `disabled`) and `onSelect`; the palette filters as you type, groups results under headings in first-seen order, moves with ArrowUp/ArrowDown (skipping disabled rows, wrapping at the ends), runs the active item on Enter and closes, and announces the match count. `open` is controlled; `hotkey={false}` leaves ⌘K to the page. Focus returns to whatever had it on Escape (hds#638).
