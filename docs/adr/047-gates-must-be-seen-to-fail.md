# ADR-047: A Gate Counts Only If It Has Been Seen to Fail

**Status:** Accepted, retroactive (decided 2026-09-22; recorded 2026-10-13 from commit and PR history). Relates to ADR-010 and ADR-027.

## Context

ADR-010 and ADR-027 removed governance that reported health it had not observed. In
the weeks after, a series of fixes found the same fault in the gates themselves:
checks that were registered, green, and not working.

September 2026:

- `bf735f2` (hds#223): `ci.yml` ran `pnpm exec vitest run`, "which bypasses npm's
  `pretest` hook". Nine gates in that chain ran "only in ralph/gate.sh and pre-commit.
  None ran in CI". hds#221 had just fixed a path-separator bug and a filename-case
  bug that "had survived because no CI run ever executed those gates".
- `294f4bb` (hds#218): a test used `skipIf(EXPORT_DEFECTS.length === 0)`. Once the
  exporter was fixed it "stopped checking anything the moment there was something
  worth checking".
- `c1561f5` (hds#262): `check-validator-wiring` accepted `manual` when the real
  channel was `pnpm-meta`. "24 gates were recorded as operator-only CLI tools while
  reachable from a package.json script." The validator still printed "wired as
  declared".
- `ddc81fc` (hds#272): `check-brand` read its expected value from the same hardcoded
  blue the generators used, so it said "all docs in sync" for four days after the
  accent became `#111111`. "A gate that sources its expected value from the wrong
  place cannot see drift in it: it defines the thing it checks."
- `33fc32a` (hds#276): `pnpm-meta` meant "named in a script", not "runs".

October 2026:

- `c88ab39` (hds#571): `validate-fixture-proof-of-firing` was "archived from
  pre-commit by #52, which is why main stayed green over the holes". It reported 18
  gates with no fixture pair and 2 failures.
- `6559963` (hds#602): `check-secrets` "is pre-commit only and skips when the binary
  is missing, so no scan ever ran".
- `87158aa` (hds#634): Chromatic exited zero on PR changes, so a visual change
  (hds#633, Kbd) went green with nobody looking.

## Decision

A gate is trusted when someone has seen it fail, and when CI runs it.

- Run the gate chain in CI through `pnpm test`, so `pretest` is defined once
  (`bf735f2`).
- Prove the gate fails. hds#262 ships "Canaries": set a gate back to the wrong
  channel and see exit 1. The PR states the rule: "A gate that has only ever been
  seen green is not known to work."
- Make positive assertions that fail when the thing they check regresses (`294f4bb`).
- Read the expected value from the one source of truth, `semantic.accent.rest`
  through `resolveAlias`, not a copy (`ddc81fc`).
- Split the registry channel. Per hds#276, `pnpm-meta` requires the referencing
  script to be reachable from a hook or CI step. The 30 gates that nothing invokes
  become `on-demand`. The PR says the taxonomy "was Adrian's call".
- Close the October gaps: fixture pairs or honest stubs for the 18 gates (`c88ab39`),
  a pinned gitleaks scan over full history in CI (`6559963`), and Chromatic failing a
  PR until the change is accepted (`87158aa`).

## Alternatives considered

- Add the nine gate scripts to the workflow by name. Rejected in `bf735f2`: listing
  them "would only drift from" `package.json`.
- Add the gates to `.husky/pre-push`. Left open: "a developer-friction tradeoff worth
  deciding deliberately".
- Relabel the 18 gates by hand. hds#276 rejected it because the label must come from
  the validator's own detection.

## Rationale

Every case had a green record and a wrong reality. The costs were concrete. The
brand spec sent every agent to a wrong colour for four days. The manifest bug "cost
two branches a CI round each". `bf735f2` and hds#262 both say green on main hid the
broken gates. Hds#262 also warns that an always-red gate "gets deleted", so a canary
should prove the gate can fail without leaving it failing.

## Consequences

- On origin/main `ci.yml` runs `pnpm test` with a comment explaining why not bare
  vitest, and runs `scripts/ci-secrets-scan.sh`. `chromatic.yml` sets
  `exitZeroOnChanges` false on pull requests.
- The registry counts today: `on-demand` 33, `pnpm-meta` 24, `manual` 11,
  `pre-commit` 9, `ci-pr` 6, `pre-push` 2.
- `validate-fixture-proof-of-firing` is still `manual`. It is the check that found
  the October holes, and nothing automatic runs it.
- hds#262 reported fixing a public typing defect it found the same way: the emitted
  `.d.ts` output was "the one artifact no gate read".

## Lessons

- Run a gate against a case that should fail before you trust a green. This is the
  canary rule.
- A check must not compute its expected value from what it checks.
- Moving a gate out of automation removes its safety net, and the meta-gate that
  catches the move needs a trigger too.
- A skipped test is a silent failure. Assert on what came out instead of skipping
  when there is nothing to check.

## Evidence

- `bf735f2` ci: run the pretest gate chain, CI was skipping nine gates (PR #223)
- `c1561f5` fix(guardrails): the registry mislabelled 24 gates ... (PR #262)
- `ddc81fc` fix(brand): the accent is a token, not a hardcoded blue in six places (PR #272)
- `33fc32a` fix(guardrails): pnpm-meta meant "named in a script", not "runs" (PR #276)
- `70abf3b` fix(manifest): stop `pnpm tokens` truncating the manifest, and gate it (PR #237)
- `ba580ff` fix(gates): make the local gate suite agree with CI (PR #221)
- `294f4bb` test(front-door): assert the legacy Figma variable export instead of skipping (PR #218)
- `c88ab39` feat(brand): bright apple-green accent ... close proof-of-firing holes (PR #571)
- `6559963` ci: run gitleaks over full history on every PR and push (PR #602)
- `87158aa` ci(chromatic): a PR's visual change fails until accepted (PR #634)
