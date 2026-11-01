---
'@hirobius/design-system': patch
---

The upgrade command and `hds-css-vars --check` now check every HDS variable your CSS and code read or write (`--hds-*`, `--semantic-*`, `--primitive-*`, `--component-*`, `--role-*`) against the target release's `dist/css-contract.json` (hds#459). A name the release does not ship is listed under Do by hand, so a read that resolves to nothing, or an override nothing reads, no longer passes silently. Reads of Tailwind's private `--tw-*` variables print a warning.
