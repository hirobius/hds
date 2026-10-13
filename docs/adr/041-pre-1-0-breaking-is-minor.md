# ADR-041: Before 1.0, a Breaking Change Is a Minor

**Status:** Accepted, retroactive (decided 2026-07-08; recorded 2026-10-13 from commit and PR history). Extended by the 2026-10-01 amendment to ADR-014, which applies the rule to removals.

## Context

hds#81 (merged 2026-07-05) dropped the `Hds` prefix from 12 leaf components. Its
changeset was marked `major`, and the commit says "Breaking major for the public
component API". The PR notes the 12 components have "zero consumers outside this
repo", so the rename is non-breaking to ops and clients.

On 2026-07-08, "the accumulated changeset queue computed 1.0.0 solely because the
Hds-prefix-drop changeset was marked major" (`ff0f603`). The package was at 0.x.

## Decision

Treat a breaking change as a minor bump while the version is below 1.0.

- `ff0f603` (hds#118) changed the changeset from `major` to `minor` "per the repo's
  pre-1.0 semver-zero convention (breaking = minor in 0.x, as with the InfoPage removal
  and the tone renames)". That cut 0.12.0.
- The changeset text now says: "Breaking rename shipped as a `minor` per the pre-1.0
  semver-zero convention".
- The commit records the risk call: "Safe: the renamed families are new this cycle with
  only fresh first-party consumers (Adrian's call)."

## Alternatives considered

- Release as `major`, which the queue computed as 1.0.0. The commit rejects it and
  gives the convention as the reason.
- Anything else: none recorded at the time.

## Rationale

Semver treats 0.x minors as breaking (the wording in `scripts/upgrade/ledger.mjs`).
The changeset says the renamed families had "zero external consumers". The InfoPage
removal and the tone renames had already shipped as breaking minors, so the commit
treats the convention as existing.

## Consequences

- The convention is now enforced. `5b2e42aa` (hds#543, 2026-10-07) added a gate in
  `check-upgrade-ledger.mjs`. A release that breaks something needs "a minor bump below
  1.0 (a major from 1.0)", and a changeset that bumps major below 1.0 fails with "HDS
  stays below 1.0 until the 1.0 cut is decided (#396)".
- ADR-014's 2026-10-01 amendment (Adrian, hds#389) lets deprecated names be removed in
  a 0.x minor, and from 1.0 only in a major.
- Still in force: `package.json` is at 0.24.1 on origin/main.

## Lessons

- Decide what 1.0 means before the changeset queue decides it for you. One `major`
  changeset was enough to make the queue compute 1.0.0.
- Write a repo convention down where the tool reads it. Here it started as a changeset
  sentence and became a gate months later.
- When the risk call rests on who the consumers are, record that and who made it.

## Evidence

- `254d9eb` refactor(components)!: drop Hds prefix from 12 leaf components (#81)
- `ff0f603` chore(release): downgrade Hds-prefix-drop changeset major to minor, cut
  0.12.0 (#118)
- `5b2e42aa` feat(upgrade): gate: every change needs an upgrade step and the right bump
  (#543)
- hds#81: refactor(components)!: drop Hds prefix from 12 leaf components
