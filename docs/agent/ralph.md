# Ralph loop

Rules for any autonomous loop in this repo. The full contract is `ralph/README.md`.
The quality bar itself is in `AGENTS.md`, "Ralph quality bar".

## Approval

- Merges are human-approved.
- The PR has the label `ralph-approved`, or the issue has the label `ralph-auto` before the work starts (batch approval).
- The PR also needs an independent PASS review comment for the head commit. The format is in `docs/agent/checks-and-merge.md`.
- Never merge your own PR.

## Labels

- `ralph-ready`: the queue. A human sets it.
- `p0` to `p3`: priority. A human sets it.
- `ralph-auto`, `ralph-approved`: merge approval. A human sets it.
- `ralph-wip`: claimed. The loop sets it.
- `ralph-parked`, `needs-adrian`: parked with a reason. The loop sets it.
- `ralph-selfheal-attempted`: the gate used its one bounded repair.

## Mechanics

- Selection is deterministic: `ralph/next.sh` sorts by priority label, then by issue number.
- Claims are atomic: `refs/heads/ralph/claim-<n>`.
- The exit codes of the loop are a contract. They are in the header of `ralph/run.sh`.
- Agents never touch `ralph-*` labels, claim refs, or `ralph/{.lock,runs.jsonl,logs/}`. The harness has those.
- The engine is org-level. The workflows are thin callers into `hirobius/ralph/.github/workflows/ralph-{run,gate}-reusable.yml@v1`.
- The loop and `ralph-gate` do not run on their own. Someone starts them by hand.
- The gate, `ralph/gate.sh`, must pass locally before any PR.
