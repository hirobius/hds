---
'@hirobius/design-system': patch
---

The package now ships its upgrade record (hds#451). `UPGRADING.md` lists what each release from 0.17.0 asks of you, newest first, in four lists: Fixed for you, Looks different, Coming next and Do by hand. `MIGRATIONS.md` and `CHANGELOG.md` ship too, so the links to them work inside `node_modules`, and so do `upgrade/index.json` (every release, its breaking count and the 0.16.0 floor), the per-release ledgers in `upgrade/releases/` and their schema, `upgrade/schema.json`. From this release on, each CHANGELOG section opens with an Upgrade block: the command to run, then what is left to do by hand. Nothing in the code changes.
