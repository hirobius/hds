#!/usr/bin/env bash
# SessionStart bootstrap — makes a fresh Claude Code on the web clone land
# typecheck-green without manual steps. See issue #138.
#
# Why this exists: src/app/data/component-api.json and
# src/app/data/token-audit-report.json are gitignored *generated* files that
# `pnpm typecheck` imports. A fresh clone lacks them, so typecheck (and the
# autonomous /tdd loop's self-verification) fails until they're materialized.
# `pnpm manifest:generate` produces component-api.json;
# `scripts/audit-tokens.mjs --full` produces token-audit-report.json.
#
# Runs synchronously so dependencies + generated artifacts are guaranteed
# ready before the agent loop starts (no race). Idempotent, non-interactive.
set -euo pipefail

# Only needed in remote (web/clone) sessions. Local devs already have deps and
# generated artifacts from their normal workflow.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# Quiet: full output goes to a log, success prints one line, failure prints the
# log tail. (component-api.json is also generated on demand by
# audit-component-integrity, so worktrees and CI self-heal without this hook.)
LOG="$(mktemp -t hds-session-start.XXXXXX)"
if { pnpm install && pnpm manifest:generate && node scripts/audit-tokens.mjs --full; } >"$LOG" 2>&1; then
  echo "✓ session-start: deps + generated artifacts ready"
else
  tail -n 40 "$LOG"
  echo "✗ session-start failed — full log: $LOG"
  exit 1
fi
