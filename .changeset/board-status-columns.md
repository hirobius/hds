---
'@hirobius/design-system': minor
---

Add `Board` and `BoardColumn` (hds#636): read-only status columns, each with a heading, a count and a tone. Columns wrap in DOM order on a grid with a 16rem minimum width, so a narrow container stacks them top to bottom in the order given. The count is part of each column heading's accessible name. No drag and drop; the consumer owns card clicks and links.
