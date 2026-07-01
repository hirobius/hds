---
'@hirobius/design-system': minor
---

Add a semantic **`tone`** axis to `Button` (`neutral | danger | success |
warning | info`), driven by the feedback tokens, so destructive and status
actions read as first-class buttons instead of falling back to a host framework:
`<Button tone="danger">Delete</Button>`. Tones apply a token-driven tonal fill
(tinted surface + matching feedback text) that clears WCAG AA in **both** light
and dark, composes with any `variant`, and defaults to `neutral` (no change to
existing buttons). `Badge` gains the matching `inProgress` tone, completing its
status set. Backed by named `feedback-*` Tailwind utilities (no arbitrary color
values).
