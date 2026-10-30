---
'@hirobius/design-system': patch
---

Upgrade ledger: a DOM and accessibility baseline (hds#468). `docs/baselines/dom-a11y.json` records each docs demo's roles, accessible names (read by a virtual screen reader), ARIA states and `data-*` attributes, with classes and ids left out; a test keeps it fresh (`pnpm dom:baseline` rewrites it). From the next release on, the upgrade gate reports a demo whose outline changed as a behavior fact, and its step must be a `behavior` step with a `detect.regex`. CONSUMING.md and the consumer skill gain "What you may select on".
