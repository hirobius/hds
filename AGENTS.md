# AGENTS.md

Agent-facing operating notes for `@hirobius/design-system`. Read `CLAUDE.md` for
the full engineering protocol; this file is the home for autonomous-loop rules.

## Ralph quality bar

REPO_TYPE: library
QUALITY BAR: Public npm package. Backward compatibility matters. Tests + Storybook stories required.

Rules for any autonomous loop in this repo:

- One issue per PR. Small steps. Never push to main.
- The gate (ralph/gate.sh) must pass before any PR. No exceptions.
- Fight entropy: leave the code better than you found it.
- No shortcut that creates debt someone else pays for.
- Merges are HUMAN-approved: `ralph-approved` on the PR, or the issue
  pre-tagged `ralph-auto` (batch approval). Never merge yourself.

Loop mechanics (see `ralph/README.md` for the full contract):

- Labels: `ralph-ready` (queue, human) · `p0`–`p3` (priority, human) ·
  `ralph-auto`/`ralph-approved` (merge approval, human) · `ralph-wip`
  (claimed, loop) · `ralph-parked`/`needs-adrian` (parked with reason, loop) ·
  `ralph-selfheal-attempted` (gate's one bounded repair, spent).
- Selection is deterministic (`ralph/next.sh`: priority label, then issue #);
  claims are atomic (`refs/heads/ralph/claim-<n>`); the loop's exit codes are
  a contract (`ralph/run.sh` header). Agents never touch `ralph-*` labels,
  claim refs, or `ralph/{.lock,runs.jsonl,logs/}` — the harness owns those.
- The engine is org-level: workflows are thin callers into
  `hirobius/ralph/.github/workflows/ralph-{run,gate}-reusable.yml@v1`.
