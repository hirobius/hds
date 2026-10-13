---
'@hirobius/design-system': patch
---

The upgrade command and the upgrade record now order releases by semver precedence, so pre-release versions (`0.21.0-next.2` before `0.21.0-next.10`, `-next-1` before `-next-2`, a pre-release before its release) sort the same way everywhere. One shared `codemods/lib/semver.mjs` replaces the two hand-rolled comparisons that disagreed.
