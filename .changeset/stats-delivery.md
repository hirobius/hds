---
'@hirobius/design-system': patch
---

`@hirobius/design-system/stats.json` gains a `delivery` block, counted offline from git: `commitsOnMain`, `mergedPullRequests` (distinct PR numbers in first-parent subjects), `firstCommitDate`, `releases` (versions in CHANGELOG.md) and `asOf` (the commit they were counted at). A shallow clone never computes it: the committed block stays, or the field is left out when there is none.
