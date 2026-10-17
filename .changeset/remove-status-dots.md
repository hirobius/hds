---
'@hirobius/design-system': minor
---

No status dots anywhere in HDS (hds#759). Removes `Badge`'s `dot`, `size` and `label` props (a Badge is always a text chip), `StatusListItem`'s leading tone dot with its `tone` prop and the `StatusListItemTone` type, and colours a `Timeline` marker by `tone` only when it draws an `icon` (a plain dot marker stays neutral). `hds/no-status-clutter` now also flags `<StatusListItem tone>`, `*-dot` classes, small round tone-coloured spans and ● glyphs. Write status as text in a `Badge`.
