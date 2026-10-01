---
'@hirobius/design-system': patch
---

Pagination and InlineCode no longer render IconButton inside (hds#392). Pagination's Previous and Next controls and InlineCode's copy button are now `Button iconOnly` with an `aria-label` and a 16px `Icon` (`size="small"`), so the rendered markup is byte-identical: same element, classes, attributes and accessible names ("Previous page", "Next page", "Copy", "Copied"). This lets IconButton be deprecated (#389) without warning every Pagination or InlineCode user about a component they never used.
