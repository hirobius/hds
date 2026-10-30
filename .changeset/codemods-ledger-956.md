---
'@hirobius/design-system': patch
---

The import codemods read their release text from the upgrade ledger (hds#956): `hds-patterns-subpath` reports a removed name as "removed in <release>" from the step that removed it, and now also reports a namespace import or `import()` of `@hirobius/design-system/patterns` that reads a removed name (`import * as P from '@hirobius/design-system/patterns'; P.Calendar`). The move, rename and fold engines take their entries and rules as data, so a later release can reuse them without a new bin.
