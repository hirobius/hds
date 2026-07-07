---
'@hirobius/design-system': minor
---

Variant contract (#60, Phase 1): establish the standard `cva` axis vocabulary — `variant` (structural), `tone` (`neutral | danger | success | warning | info`), `size` (`sm | md | lg`), `density` (`comfortable | compact`) — documented in `docs/architecture/variant-contract.md` and enforced by the extended `check-prop-vocabulary` gate (new tone/density allowlist rules). Converts the first reference batch to the contract: `Tag`, `Divider`, `Stat`, `Field`, `AvatarGroup`, `CircularProgress`.

Breaking (value rename): `Stat` and `Field` rename their `tone="default"` value to `tone="neutral"` to align with the fixed tone set — pass `neutral`, or omit it (it remains the default). `Divider` gains a `variant="default" | "strong"` axis; the existing `strong` boolean is retained as deprecated back-compat and still works.
