---
'@hirobius/design-system': patch
---

The `docs/CONSUMING.md` section 7 sample imports the `tokens` subpath as a default import (`import tokens from '@hirobius/design-system/tokens'`); it had a named import, which does not typecheck. `pnpm smoke:consumer` now typechecks every ```tsx fence in the shipped docs and the starter kit against the packed build, so a stale sample fails the smoke (hds#457).
