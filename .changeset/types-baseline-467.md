---
'@hirobius/design-system': patch
---

Upgrade ledger: a types baseline (hds#467). `docs/api/types-baseline.json` now ships: each export of each entry as the TypeScript checker sees it (value or type, signatures, static members such as `Menu.Item`, and the key paths of exported objects such as `hds`). From the next release on, the upgrade gate reports a value turned type-only, a changed signature, a removed compound part and a removed object key as breaking. `pnpm api:check` now records the root's `export * as` and package re-exports, and no longer fails a symbol that moved between root modules.
