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

# Design gates (#181): a curated, cheap, high-signal slice of `check:full` —
# NOT the whole suite (that's check:release territory) — so a contrast/focus
# regression blocks auto-merge without materially slowing the gate. Each of
# these is confirmed green on clean main before being wired in here; each
# runs in well under a second. Only 3 of the 6 gates named in #181 landed —
# check-reduced-motion (#185), check-tier-bypass (#186), and check-page-shell
# (#187) are red (or, for page-shell, target a directory deleted in the
# ADR-018 Storybook migration) on clean main for reasons out of scope for
# this change.
#
# check-hardcoded-colors was archived off automatic gating in #52 (ADR-018
# §5, pre-commit friction); this re-introduces automatic gating for it via a
# different, lower-friction channel (PR-time via Ralph, not every human
# commit). docs/guardrails/registry.json's firingChannel schema has no slot
# for "also fires from ralph/gate.sh" — see #188.
run_step pnpm check:contrast
run_step pnpm check:focus
run_step pnpm check:colors

run_step pnpm typecheck
run_step pnpm test
run_step pnpm lint

echo "── gate: all green"
