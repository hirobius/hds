# ADR-048: Open the Version Packages PR with a release PAT

**Status:** Accepted, retroactive (decided 2026-09-22; recorded 2026-10-13 from commit and PR history).

## Context

hds#266 ("Version Packages", 0.14.0) could not be merged. GitHub does not start a
workflow run from an event created with `GITHUB_TOKEN`. The release workflow used
`GITHUB_TOKEN` to open that PR, so `ci.yml` (`on: pull_request`) never fired and the PR
carried no checks.

This was invisible while nothing was required. Once `main` required `Lean gate set`,
the PR needed a check that could never run on it. Vercel still reported, which "made it
read as CI declining rather than CI being suppressed". Vercel is a GitHub App, not a
workflow, so the guard does not apply to it.

## Decision

The release workflow authors the Version Packages PR with `RELEASE_PAT`, a user-owned
fine-grained token.

- hds#267 gave the token to the changesets step.
- hds#271 gave it to `actions/checkout` too. Checkout persists its token into
  `.git/config` (`persist-credentials` defaults to true), and that credential is what
  pushes the branch. The push decides the event's actor.
- A guard step runs first and fails the run if `RELEASE_PAT` is missing or expired,
  naming the secret and the fix. It reads the secret through `env`, not through
  `if: ${{ secrets.X == '' }}`, because the secrets context is "not reliably available
  in a step-level `if`".

The commit says Adrian must create the PAT and add it as a repo secret.

## Alternatives considered

- **Admin bypass of the required check.** Rejected. It "would have meant admins
  bypassing every required check on every PR forever to ship one version bump".

None other recorded at the time.

## Rationale

With a user token the release PR gets the same CI as any other PR and merges "on its own
merit". The guard exists because the changesets action would otherwise still succeed on a
token that cannot trigger CI, and the deadlock "would return silently". The commit calls
that "the same vacuous-green shape this repo spent the day removing elsewhere".

## Consequences

- The first fix was not enough. The first run under it (Release #134) pushed a fresh
  commit to #266, CI created a run at last, and the run came back `action_required`
  with actor `github-actions[bot]`, waiting for a human to click Approve. Evidence: run
  35811146524, head `e0772331`. Moving the PAT to checkout fixed the other half.
- The guard moved to the first step, so a missing secret fails with a message that names
  it, not a git auth error.
- On origin/main `release.yml` still has the guard, `RELEASE_PAT` on checkout, and the
  explanatory header. Later "Version Packages" PRs (for example #550, #580, #588,
  #601, #603) exist in history. The publish step later moved to npm Trusted Publishing
  (`1996d789`, #346), which does not change this decision.
- Both commits verified the workflow by parsing the YAML. The 9406361 commit says the
  workflow "cannot be run from here", so the proof that the actor changes was the next
  real run. The commits do not record that run's result.
- A PAT expires. The guard is the only thing that announces it.

## Lessons

- An event made with `GITHUB_TOKEN` starts no workflows. Any bot-authored PR that needs
  required checks needs a different identity.
- The credential that pushes decides the actor. Check every step that holds a token, not
  only the one that calls the API.
- A guard for a missing secret must run first and must not rely on a condition that can
  silently evaluate false.
- Prefer fixing the identity over bypassing the check.

## Evidence

- `ed71b9e` fix(release): the release PR could never run CI, so it could never merge
  (#267)
- `9406361` fix(release): the PAT has to reach checkout, not just changesets (#271)
- hds#266: Version Packages (0.14.0), described in the commits above
