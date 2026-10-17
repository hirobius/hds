---
'@hirobius/design-system': minor
---

Removes `BoardColumn`'s `tone` prop and its status dot, and the `--hds-accent-bar` CSS variable; adds the `hds/no-status-clutter` ESLint rule (flags `<Badge dot>` and coloured left-border accent bars). Status is implied by content: a column's title and count carry it. The `Badge` `dot` prop is removed in a separate change.
