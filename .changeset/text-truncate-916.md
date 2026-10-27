---
'@hirobius/design-system': minor
---

Text: new `truncate` and `lineClamp` props (hds#916). `truncate` cuts the text to one line with an ellipsis and lets it shrink in a flex or grid row (a span is made a block so the ellipsis applies). `lineClamp={2 | 3 | 4}` cuts it to that many lines with an ellipsis, breaking between words, `mono` included; a single run too long for a line breaks inside itself only then. The two are mutually exclusive in the types. New exported type `TextLineClamp`. Breaking for types only: `TextProps` is now an intersection with a union, so `interface X extends TextProps` no longer compiles; use `type X = TextProps & { … }`.
