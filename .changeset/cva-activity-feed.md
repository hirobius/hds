---
'@hirobius/design-system': minor
---

CSS-in-JS → Tailwind (#60): migrate `ActivityFeed` to Tailwind + `cva`, formalizing the status axis as a `tone` variant (`activityToneVariants` / `activityAvatarVariants`). Typography composites (`heading3`/`body`/`ui`/`technical`) and the avatar/list resets move from inline `style` objects onto var()-bound Tailwind classes on the exact same `--semantic-*`/`--primitive-*` custom properties — no visual change.

**Value rename (non-breaking):** `ActivityEvent`'s color axis now follows the HDS tone vocabulary (`neutral | danger | success | warning | info`) via a new optional `tone` prop, matching the fixed contract in `docs/architecture/variant-contract.md`. The old `status` prop (`ActivityStatus`, including `'error'`) is deprecated but still fully supported: `status="error"` resolves to the same `danger` tone as `tone="danger"` (proven by a byte-for-byte render-output test). New code should use `tone`; `status`/`ActivityStatus` will be removed in a future major.
