# Fleet hub

This repo is part of the Hirobius fleet. The operations hub is the `hirobius/ops` repo.

- Fleet state: `/api/projects` on the ops dashboard.
- Consolidated tasks: `/ops/tasks`. The GitHub Issues of this repo sync there.
- Current cross-project state: the HANDOFF file in the ops repo (docs/ai/HANDOFF.md there).

## Conventions for each session

- Track new work as GitHub Issues in this repo. Never use a local TODO file.
- State is derived, not written (ops ADR-010). Ops reads release, next and blocked from `package.json` and the issue labels.
- Set `focus` in `status.json` only when the direction of this repo changes.
- Read the ops HANDOFF before a cross-project decision.
