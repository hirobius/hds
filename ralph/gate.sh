#!/usr/bin/env bash
# Feedback gate Ralph must pass before opening a PR. Red = no PR — the gate
# FAILS CLOSED: any step failing aborts immediately and names the culprit.
set -euo pipefail
cd "$(dirname "$0")/.."

run_step() {
  echo "── gate: $*"
  if ! "$@"; then
    echo "── gate FAILED at: $* — no PR, no done. Fix the change until green." >&2
    exit 1
  fi
}

# design-system: manifest:generate + audit-tokens --full first materialize the
# gitignored-but-imported src/app/data/{component-api,token-audit-report}.json
# a fresh clone lacks, else typecheck fails (the #138 fresh-clone bootstrap).
# Then the standard trio. This file is the ONLY per-repo part of the gate.
run_step pnpm manifest:generate
run_step node scripts/audit-tokens.mjs --full
run_step pnpm typecheck
run_step pnpm test
run_step pnpm lint

echo "── gate: all green"
