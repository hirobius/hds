# ADR-043: Shelve HDS, Then Reverse It Two Days Later

**Status:** Accepted, retroactive (decided 2026-07-08; recorded 2026-10-13 from commit and PR history). Reversed on 2026-07-10 (see Consequences).

## Context

In early July 2026 a build-vs-buy audit reached the verdict "SPLIT". `205f633`
(hds#122) summarises it: the design system "was absorbing more maintenance than its
two consumers justify". The clients marketing factory used "only the token spine (no
React components)". The one component consumer, the internal ops dashboard, was
"dormant". The commit says "Ship-fast is the new priority."

At the time HDS had 133 components, 351 DTCG tokens, about 110 stories, the full
guardrail suite and `@hirobius/design-system@0.12.0` published.

## Decision

Freeze HDS as a "complete package", not delete it (`205f633`, 2026-07-08).

- README gets a FROZEN banner with what, why and how to unshelve.
- `chromatic.yml` and `release.yml` lose their automatic triggers and become manual
  (`workflow_dispatch`).
- `status.json` phase becomes `frozen`.
- Two unreleased changesets are dropped. Future work is tracked in epic hds#80.

Then one exception. `9e9f19e` (hds#135) re-enabled `release.yml` to cut a single
0.13.0, so the published package matched the shelved repo. The Changesets action
opened "Version Packages" (`c559d59`, hds#136). `d105fb5` (hds#137) put `release.yml`
back to manual-only the same day (2026-07-09).

On 2026-07-10 the freeze was reversed. The comment on hds#155 reads: "Resolved: HDS
is no longer frozen (Adrian, 2026-07-10). Epic #124 is the active line of work; #80
(freeze epic) is closed as superseded."

## Alternatives considered

None recorded at the time. The audit's verdict was "SPLIT", but the commits do not
describe the other side of the split.

## Rationale

For the freeze: the maintenance cost against two consumers, as quoted above. For the
reversal, the commits do not record why. What they record is the evidence that forced
the question. A Claude triage bot filed hds#155 on 2026-07-10 and called it "a
governance contradiction, not a code defect". `status.json` and the README said "no
new development". Meanwhile an autonomous Ralph loop (ADR-011) was live, with "15
PRs merged in the last ~36h". It was working through epic hds#124, created the same
day as the freeze. The Ralph CI, gate and auto-merge scaffolding was added after the
re-freeze commit, in hds#139, #140, #143, #145, #147, #150 and #153.

## Consequences

- The freeze lasted two days. `646c41e` (hds#165, 2026-07-11) reconciled
  `status.json` and the README, because both "still claimed frozen/on-the-shelf"
  after the unfreeze.
- The release trigger was not restored with it. A comment in `release.yml` says:
  "Un-shelved 2026-09-14 (#199). The repo was unfrozen 2026-07-10 (#155) but this
  trigger was never restored, so nothing shipped after 0.13.0 while work kept
  merging." The push trigger on main is in place today.
- Today `status.json` has `"phase": "active"` and the README has no freeze banner.
  The only "frozen" text left is about the old GitHub Packages listing.

## Lessons

- A pause that lives only in prose does not stop anything. The README and
  `status.json` said "frozen" while the loop kept shipping. If a freeze matters,
  enforce it in the automation (disable the workflow), not only in the docs.
- Reversing a freeze needs the same checklist as starting one. The banner, status
  and epic were reconciled in days. The release trigger took until September.
- Autonomous work widens the gap between what the docs say and what the repo does.
  The contradiction was caught by an automated triage pass, not by a person.

## Evidence

- `205f633` chore: freeze HDS, shelve as a complete package (PR #122)
- `9e9f19e` chore(release): stage final 0.13.0 cut (PR #135)
- `c559d59` Version Packages (PR #136)
- `d105fb5` chore: re-freeze after the 0.13.0 cut (PR #137)
- `646c41e` chore: reflect HDS unfreeze in status.json + strip README banner (PR #165)
- hds#155: Triage: general repo-health (closed 2026-07-10 with Adrian's resolving comment)
- hds#199: release trigger restored (cited in `.github/workflows/release.yml`)
