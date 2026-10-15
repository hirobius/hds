---
'@hirobius/design-system': minor
---

`--leading-relaxed` and the `.leading-relaxed` utility class are no longer in `styles.css` or `tokens.css`. It was never a documented token: a Tailwind scan of the unused `hds-registry.json` generated it as a side effect, and deleting that file drops it. No fleet repo reads it; if you do, set your own `line-height` or use the semantic body line-height token.
