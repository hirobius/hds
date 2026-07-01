---
'@hirobius/design-system': minor
---

Add an **in-progress / secondary** semantic feedback hue and gate the feedback
palette for accessibility. New `--semantic-color-feedback-inProgress` (violet:
`#6d28d9` light / `#a78bfa` dark) plus its tinted-surface pair
`--semantic-color-feedback-bg-inProgress`, backed by a new `violet` primitive
ramp. This completes the status palette (success / warning / info / error /
in-progress) so consumers can theme status UI — Saved / Applied / Interviewing /
Offer / Rejected — from HDS tokens alone, with no local status hex.

`scripts/check-contrast.mjs` now asserts every hex feedback token clears WCAG AA
for small text on **both** the page and card (`raised`) surfaces, in light and
dark. `docs/CONSUMING.md` publishes the feedback token names for downstream
mapping.
