# ADR-061: Project state is derived, and every state surface is registered

**Status:** Accepted, retroactive (decided 2026-10-12; recorded 2026-10-13 from commit and PR history). Builds on ADR-010 and ADR-027, and on the fleet spec hirobius/ops#576.

## Context

By October 2026 the repo carried many files that described project state: release
numbers, counts, roadmaps, snapshots, status notes. hds#612 was written after an
audit dated 2026-10-12 and names what it found: dead references (`docs/ai/orchestration.json`
in two docs, `content/docs/button.mdx` in an inventory, "6 pre-commit gates" in the bug
template) and stale snapshot docs. Its parent is hirobius/ops#576, "Spec: derive fleet
state instead of hand-writing it (status.json, HANDOFF, session board, front doors)".

The fleet-hub rule already said state is derived (ops ADR-010). `status.json` still
held a hand-kept `release` object, which `compile.mjs` wrote. The always-on agent
files (CLAUDE.md and what it marks read-first) had no cap on size or on derived facts.

Earlier, on 2026-10-09, the North Star (`f3a6797`, PR #575) gave HDS an explicit
purpose, a priority order for who it serves, and non-goals. CLAUDE.md points to it as
the "focus contract", with a drift check: if an ask does not serve the North Star,
say so in one sentence.

## Decision

All in `96c536e` (PR #623, closes hds#612 and hds#613):

- **Registry.** `docs/state-surfaces.json` lists every file or section that describes
  state as `generated`, `checked` or `editorial`. A generated entry names the `check`
  that proves it fresh, or says `"freshness": "unchecked"`. An editorial entry has an
  owner, `reviewedAt` and `maxAgeDays`.
- **Gate.** `scripts/check-state-surfaces.mjs` fails on a missing registered path, a doc
  that names a path that does not exist, and derived facts (versions, counts, lists of
  three or more issues, "as of" state) in the always-on files. An editorial file past
  its review age only warns "review due"; `--strict-review` makes it an error. It takes
  `--root` and `--registry` so other repos can vendor it.
- **Steering budget.** `scripts/check-steering-budget.mjs`, ported from ops#292, caps
  the size of the always-on files. The cap is "the measured size ... plus 5%, not a
  round number".
- **status.json v2.** It holds `schemaVersion`, `focus`, `phase`, `note`, `updatedAt`
  and `consistency`. `compile.mjs` no longer writes a release object, "since ops
  derives the release from package.json".
- **Front door.** `docs/ai/FRONT-DOOR.md` is generated from the registry, with
  `docs/ai/DOCS-INDEX.md` as the on-demand index. `docs/ai/` is forbidden in the npm
  tarball.
- **Archive.** Five stale docs moved to `docs/archive`: CONSUMER_READINESS_BACKLOG,
  HARDENING_ROADMAP, HDS-V2-COMPLIANCE-AUDIT, inventory and SYSTEMS_REGISTRY.

## Alternatives considered

The generated front door first went into the shipped `AGENTS.md`. A review fix moved it
to `docs/ai/FRONT-DOOR.md`, because AGENTS.md ships in the npm package and should not
carry an internal URL. No other alternatives are recorded.

## Rationale

The recorded reason is in the commit: a hand-written fact goes stale, and ops can
derive the release, the open work and what is blocked from live data. The front door
says so directly: "Nothing in the repo records the release, the open work or what is
blocked: the ops dashboard derives them." Hand-written state is limited to focus and
phase.

## Consequences

- Still in force on origin/main. `docs/state-surfaces.json` has 52 `path` entries,
  `check-state-surfaces` and `check-steering-budget` run in `pretest`, and
  `docs/guardrails/steering-budget.json` sets `maxTotalBytes` at 26518.
- Every editorial doc now carries a review date. After re-reading one, a session bumps
  `reviewedAt`.
- The same commit made real `--check` modes for six generators (README counts,
  DESIGN.md, handoff, llms, consumer-usage, Figma disposition), so a "generated"
  label is something a gate can test.
- Files with no local freshness check (CHANGELOG.md, `figma/inventory.json`) are
  marked `unchecked`, so the gap is on record.

## Lessons

- Register every file that claims to describe state, with what keeps it true. A file
  with no keeper goes stale.
- Keep derived facts out of the files every session loads. They cost tokens every
  time and are wrong sooner than anything else.
- A review date that only warns is a nudge. The commit kept `--strict-review` for a
  scheduled run rather than blocking every commit.
- Set a size cap from a measurement, not a round number.

## Evidence

- `f3a6797` docs: HDS North Star + drift check (PR #575)
- `96c536e` feat(state): state-surface registry + gate, generated front door, status.json v2 (PR #623, closes hds#612, hds#613)
- hds#612: State-surface registry + gate; fix dead refs; archive snapshot docs
- hds#613: Generated front door: AGENTS.md repo section from the registry
- hirobius/ops#576: Spec: derive fleet state instead of hand-writing it
