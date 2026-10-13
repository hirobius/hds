# ADR-044: Run the Autonomous Loop as an Org-Level Engine, Hardened by Its Failures

**Status:** Accepted, retroactive (decided 2026-07-10; recorded 2026-10-13 from commit and PR history). Extends ADR-011.

## Context

ADR-011 set the rule that an autonomous loop ships only through a verifier. In
July 2026 the loop was built in HDS, run, and broken in ways that shaped its design.

- 2026-07-09: `9caa1fd` (hds#139) added the Ralph scaffolding: a prompt, `gate.sh`
  (typecheck, test, lint) and run/loop drivers. `2df2d51` (hds#140) added a
  manual-dispatch workflow using `anthropics/claude-code-action`. `af00426` (hds#143)
  added an auto-merge review gate and a cron.
- `af00426` wrote down the risk: "enabling auto-merge on a PUBLIC package is a
  deliberate early-stage choice (consumption is still minimal). REVISIT ... once it
  has real external consumers or before any 1.0 (backward-compat risk a green gate
  can't catch)."
- The same loop and the freeze in ADR-043 were running side by side.

## Decision

Move the loop into a shared org engine, `hirobius/ralph`, and keep thin callers in
HDS. `0bf4bc72` (hds#158, 2026-07-10) vendored the `ralph/` kit with "deterministic
selection, atomic claims, exit-code contract, human-approved merges, bounded
self-heal". `225d7a8` (hds#167) pins the reusable workflows to `@v1`, so "upgrading
the engine here becomes a deliberate caller bump, never a side effect of an engine
push".

Then harden it from each failure:

- `7d14902` (hds#145): `allowed_bots: '*'` on the review step.
- `dad821c` (hds#157): the reviewer "defaults to approve unless a concrete defect".
- `79b7600` (hds#153): trigger on the `ralph-ready` label instead of cron.
- `9f8d992` (hds#172): re-sync `lib.sh` for the `repo_slug` fix (ralph#9).
- `f3bb1f5` (hds#177): an hourly idle watchdog on top of the label trigger.
- `c3f1d48` (hds#178): a `ralph-blocked:` sentinel for deliberate stops.

## Alternatives considered

- Keep auto-merge on the public package. Written down as an early-stage choice to
  revisit. The org migration replaced it the next day with human-approved merges.
- Cron as the main trigger. Replaced by labels in `79b7600`. The commit does not say
  why.

## Rationale

Each fix has a recorded cause.

- `claude-code-action` "blocks bot-initiated runs by default", so the review step
  failed on Ralph's own PRs, no `verdict.json` was written, and the gate "fail-safed
  to request_changes".
- The reviewer prompt asked it to "default to request_changes when uncertain". The
  deterministic gate had already run, so `dad821c` told it to flag only a nameable,
  material defect. The commit message is empty. This reading comes from the diff.
- `f3bb1f5`: "the event-driven Ralph chain halts silently when it goes idle", and
  label runs queued behind a running one "are cancelled by the concurrency dedup and
  never replayed (observed fleet-wide 2026-07-12 ... including P0s)".
- `c3f1d48`: a deliberate stop used to count as a failed attempt, "reddening the run,
  and halting the chain (the site-engine#86 stall class)".
- `9f8d992`: the action's tokenized origin URL "poisoned repo_slug in reconcile".
- `225d7a8`: vendored callers could skew against the engine's `@main`.

## Consequences

- Today `ralph.yml` and `ralph-gate.yml` are thin callers into
  `hirobius/ralph/...@v1`. The `ralph/` directory holds the kit and `kit.lock.json`
  pins it to `hirobius/ralph@13f8cec`. Merges need a human (`ralph-approved` on the PR,
  or `ralph-auto` on the issue). Auto-merge without approval did not survive.
- The watchdog did not stay hourly. `f768355d` (2026-07-15) commented it out to move
  off GitHub-hosted minutes, "replaces the hourly tick" with a local runner (ops#214).
  `ralph.yml` records that the runner "was subsequently deferred and never built",
  and hds "sat idle for two months". It was re-armed at 6 hours on 2026-09-14
  (hds#201, `ef3a3a45`).
- The kit is shared. The `site-engine#86` stall and the ops fleet were hit by the
  same faults, so fixes went into the engine and were re-synced.

## Lessons

- A fail-safe default is right for a verdict that cannot be read, but it needs a test
  against the loop's own PRs. Here the gate rejected everything the loop made.
- An event-driven chain needs a heartbeat. Silent idleness was the main failure, and
  it was seen in three repos.
- Distinguish "I stopped on purpose" from "I failed" in the protocol. A sentinel
  comment did that.
- Remove an automatic risk when you write "REVISIT" next to it. Here it was
  replaced a day later. Keep the replacement cheap: a label on the PR.

## Evidence

- `9caa1fd` chore(ralph): autonomous Ralph loop scaffolding (PR #139)
- `2df2d51` ci(ralph): manual-dispatch Ralph loop workflow (PR #140)
- `af00426` ci(ralph): hds vercel fix + auto-merge gate + cron (PR #143)
- `7d14902` fix(ralph-gate): allow bot-authored PRs (PR #145)
- `dad821c` ci(ralph-gate): reviewer defaults to approve unless a concrete defect (PR #157)
- `79b7600` ci(ralph): trigger on ralph-ready label instead of cron (PR #153)
- `0bf4bc72` feat(ralph): migrate to the hardened org-level loop (PR #158)
- `225d7a8` ci(ralph): pin engine reusables to @v1 (PR #167)
- `9f8d992` chore(ralph): re-sync lib.sh, repo_slug tokenized-URL fix (PR #172)
- `f3bb1f5` ci(ralph): hourly idle watchdog + kit re-sync (PR #177)
- `c3f1d48` ci(ralph): re-sync kit, deliberate blocked-stop no longer burns an attempt (PR #178)
- `f768355d` guardrails: ... disable hourly Ralph cron (PR #184)
- `ef3a3a45` Restore CI triggers on ralph/release/chromatic workflows (PR #204)
