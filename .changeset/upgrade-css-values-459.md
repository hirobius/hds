---
'@hirobius/design-system': patch
---

The upgrade command compares the installed and the target release's `dist/css-contract.json` (hds#459) and lists, under Looks different, each HDS variable whose value changed that the consumer reads or writes, with its old and new values. Variables the consumer never names are not reported, and a variable a release's ledger already records a value-changed step for keeps that step's wording.
