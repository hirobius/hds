---
'@hirobius/design-system': patch
---

Reviewer-fix follow-up to the docs-tooling relocation (hds#133, commit edb31c0):
re-key `.token-path-baseline.txt`'s `health-rail.tsx` line to its new location
`src/docs-tooling/health-rail.tsx` (the stale `src/app/components/` path was
tripping `check-token-paths-ratchet.mjs`'s default-mode gate with a "new"
violation that was really the same pre-existing one, just moved). Regenerate
`src/app/design-system/token-usage-map.json` (`pnpm tokens:index`) and
`docs/audits/exceptions-audit.md` (`node scripts/audit-exceptions.mjs`) so both
reference the moved docs-tooling paths instead of the old
`src/app/components/*` ones. No component code changed.

Refs hirobius/hds#133
