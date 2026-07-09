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
