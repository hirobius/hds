---
'@hirobius/design-system': patch
---

Upgrade command: skips a version npm marks deprecated (a yanked release, hds#472). With no `--to`, a deprecated target moves to the newest good version and the report lists it under the new `skipped` field; `--to` a deprecated version refuses and changes nothing. It reads the npm registry with a 3-second timeout and runs as before when offline (`HDS_UPGRADE_REGISTRY=off` skips the lookup). UPGRADING.md gains "If a release is bad": revert the upgrade PR, pin the last good version, re-run `upgrade` once a fix ships.
