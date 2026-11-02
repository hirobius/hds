---
'@hirobius/design-system': patch
---

Upgrade ledger: a props baseline (hds#461). `docs/api/props-baseline.json` now ships: every component's props with their type, whether they are optional, their allowed values (literal unions expanded) and their default, cva `defaultVariants` included. From the next release on, the upgrade gate reports a prop removed or renamed, a prop now required or an allowed value removed as breaking, and a changed default as a look step; new step kinds `prop-renamed` and `prop-value-mapped` carry a `prop` map for the prop-map codemod (hds#460).
