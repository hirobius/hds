# ADR-054: Enforce the record at pre-push

**Status:** Accepted, retroactive (decided 2026-09-24; recorded 2026-10-13 from commit and PR history). Partly superseded by `6db35fb` (per-PR `.status/` notes replace `status.json` bumps as the proof of freshness).

## Context

ADR-010 retired `docs/SYSTEMS-LOG.md`, an auto-generated ledger that "was not wired to
any commit hook and duplicated git history". It named the replacement: git history,
`CHANGELOG.md`, ADRs, and `status.json` for the fleet dashboard.

That replacement went stale the same way. `4aa180d` says `CLAUDE.md` "has required a
status.json bump 'before ending any session that changed project state' since it was
written, and nothing enforced it -- so it held only when someone remembered". The issue
behind it, hds#249, found `CHANGELOG.md` "last touched two months" earlier. The issue
also counted five pending changesets. The commit notes none were pending on its branch,
so that part had been fixed already.

## Decision

Add `scripts/check-record-freshness.mjs`, a gate on `pre-push` (`.husky/pre-push`,
registry `firingChannel: pre-push`). It checks the commits a push will publish, which is
the range from the upstream branch to HEAD, or the tip commit when there is no upstream.

1. **Status freshness.** A commit touching `src/`, `scripts/` or `docs/adr/` must be no
   newer than `status.json`'s `updatedAt`.
2. **Changeset presence.** A commit that changes what ships to consumers needs a
   pending `.changeset/*.md` or a `skip-changeset` marker in its message. The script
   header lists what counts as shipping. hds#448 widened it beyond `src/` after 0.20.0
   dropped five runtime dependencies "with only package.json changed".

The commit says this is "the enforcement, not a new ledger", which hds#249 put out of
scope.

## Alternatives considered

- Gate at pre-commit. Rejected in the header: "mid-branch commits should not each demand
  a status bump, but a push is a state change the fleet dashboard renders."
- A new ledger. Out of scope in hds#249, and ADR-010 had just retired the old one.

## Rationale

- A rule that depends on memory failed. The gate replaces the memory with a check.
- Pre-push matches when the state becomes visible. Commits inside a branch stay free.
- The gate caught its own repo. The commit says that running it against recent history
  "caught status.json stale before this commit updated it".

## Consequences

- The gate was written with a pure-function layer and a CLI suite. The CLI suite builds
  a disposable git repo per test. That suite caused the first incident (below).
- `status.json` bumps conflicted between branches. `6db35fb` (PR #526) added
  `.status/<branch>.md` notes. `.status/README.md` says a bump of `status.json`
  "conflicts on every PR". The gate now accepts a note as proof, and `pnpm status:fold`
  bumps `updatedAt` on main and deletes the notes. Only `focus` and `phase` stay
  hand-written.
- Later commits kept tuning the gate: `5ecb47d` (fail-fast, PR #509), and `5b2e42a`
  (PR #543) added the upgrade-note requirement. `CLAUDE.md` now describes both.
- On origin/main the gate still runs from `.husky/pre-push`.

### Incidents: tests run inside a hook inherit `GIT_DIR`

- 2026-09-25, `c11be0b`: under the pre-push hook from a worktree, git exports `GIT_DIR`
  and related variables. The CLI test inherited them, so its throwaway repo commands hit
  the real repo. The result was "junk commits on the pushed branch and
  core.bare/user.name rewritten in .git/config". The fix strips `GIT_*` from every git
  and gate subprocess.
- 2026-10-07, `25582b0` (PR #518, hds#517): `check-tests-with-code`'s test had the same
  flaw. "HEAD moved to 'feature', the branch ref and origin/main were rewritten, and
  core.bare=true landed in the shared config." The fix stripped `GIT_*` "the same way
  check-record-freshness.cli.test.mjs already does" and added a decoy-`GIT_DIR` test
  that "fails red without the fix".

## Lessons

- Any test that builds a scratch git repo must strip `GIT_*` from its subprocess
  environment, because hooks export them. The first fix did not spread to the next test
  that needed it. A decoy-`GIT_DIR` test is the check that does.
- Enforce at the event that changes shared state (push), not at the event that happens
  most often (commit).
- A required per-branch edit to a shared file will conflict. Give each branch its own
  file and fold them later.

## Evidence

- `4aa180d` feat(guardrails): gate status.json / changeset staleness at push time (hds#249)
- `c11be0b` fix(test): isolate check-record-freshness CLI test from hook GIT\_\* env
- `25582b0` fix(test): check-tests-with-code no longer corrupts the pushing repo under the pre-push hook (PR #518, hds#517)
- `6db35fb` feat(status): per-PR .status/ notes replace status.json bumps in the freshness gate (PR #526)
- `5ecb47d` chore(hooks): quiet hooks, fail-fast record-freshness (PR #509)
- hds#249: record freshness gate; hds#448: what counts as shipping
