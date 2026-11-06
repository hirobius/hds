---
'@hirobius/design-system': patch
---

`@hirobius/design-system/stats.json` gains a `delivery` block, counted offline from git at the merge-base with `origin/main`: `commitsOnMain`, `mergedPullRequests` (PRs merged into main, by squash or merge commit), `firstCommitDate`, `changelogVersions` (version headings in CHANGELOG.md; not a count of npm publishes), `asOf` and `asOfDate`. It is recounted only by `pnpm stats:build --delivery`; every other run, release CI included, keeps the committed block.
