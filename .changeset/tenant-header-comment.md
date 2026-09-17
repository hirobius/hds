---
'@hirobius/design-system': patch
---

**fix(tokens):** the generated tenant overlay CSS no longer drops the first
brand's base rule. Its header comment contained `*/` inside a file glob, which
closed the comment early and turned the rest of the header into an invalid
selector prefix for the first `[data-brand]` rule. That brand's light overrides
now apply.
