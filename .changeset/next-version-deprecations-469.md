---
'@hirobius/design-system': patch
---

`check-deprecations` now compares each `@removeIn` and token "removed in" against the version the pending changesets will release, not only package.json's version (hds#469). A PR whose minor changeset makes a deprecation due now fails on that PR instead of on the Version PR. No API changes.
