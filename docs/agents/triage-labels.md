# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker (vocabulary: see CLAUDE.md).

| Label in mattpocock/skills | Label in our tracker     | Meaning                                                        |
| -------------------------- | ------------------------ | -------------------------------------------------------------- |
| `needs-triage`             | `backlog`                | Maintainer needs to evaluate this issue                        |
| `needs-info`               | `needs-adrian`           | Waiting on Adrian for more information                         |
| `ready-for-agent`          | `ralph-ready`            | Fully specified, queued for the Ralph loop (see below)         |
| `ready-for-human`          | `needs-adrian`           | Requires human implementation                                  |
| `wontfix`                  | _(close, `not_planned`)_ | Will not be actioned: close the issue as not planned, no label |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## Publishing to the factory

Approving a `/to-tickets` breakdown is the only human step: every published ticket must already be in the shape Ralph's queue reads, or `ralph/next.sh` skips or parks it.

- Label: `ralph-ready` (the `ready-for-agent` role).
- Body: an `## Acceptance criteria` checklist of `- [ ]` items (no checklist = parked on sight) and a `## Blocked by` section of `- #N` refs, or `- None (can start immediately)` when free. Ralph picks only tickets whose blockers are all closed.
- `ralph-auto`: always add it. hds configures no supervised paths, so none can apply.

Contract test: `scripts/__tests__/to-tickets-contract.test.mjs` in hirobius/ops runs the kit parser on the vendored template, so a skills bump that reshapes it fails CI.
