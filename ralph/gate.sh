#!/usr/bin/env bash
# Feedback gate Ralph must pass before opening a PR. Red = no PR — the gate
# FAILS CLOSED: any step failing aborts immediately and names the culprit.
set -euo pipefail
cd "$(dirname "$0")/.."

# TEMPORARY step timing (remove 2026-10-31, hds#912):
# each step prints "⏱ <step> <s>s"; on exit, green or red, a slowest-first
# table prints and one JSON line lands in .gate-timings.jsonl.
now_ms() {
  if [ -n "${EPOCHREALTIME:-}" ]; then
    local t="${EPOCHREALTIME/[.,]/}"
    echo $((10#$t / 1000))
  else
    echo $(($(date +%s) * 1000))
  fi
}
GATE_T0=$(now_ms)
GATE_STEPS=$(mktemp)
finish_timings() {
  local code=$?
  node scripts/gate-timings.mjs finish --runner gate --steps "$GATE_STEPS" \
    --total-ms $(($(now_ms) - GATE_T0)) || true
  rm -f "$GATE_STEPS"
  exit "$code"
}
trap finish_timings EXIT

run_step() {
  echo "── gate: $*"
  local t0 ok=1
  t0=$(now_ms)
  "$@" || ok=0
  local ms=$(($(now_ms) - t0))
  printf '%s\t%s\t%s\n' "$*" "$ms" "$ok" >>"$GATE_STEPS"
  echo "⏱ $* $(awk "BEGIN{printf \"%.1f\", $ms/1000}")s"
  if [ "$ok" = 0 ]; then
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
# runs in well under a second. 4 of the 6 gates named in #181 have landed —
# check-tier-bypass (#186) and check-page-shell (#187) are still red (or, for
# page-shell, target a directory deleted in the ADR-018 Storybook migration)
# on clean main for reasons out of scope for this change.
#
# check-reduced-motion (#185) was red on clean main because its Layer 2 check
# targeted src/app/App.tsx, deleted in the same migration; retargeted to
# Layer 1 (CSS @media prefers-reduced-motion) only, with Layer 2 (JS/Motion
# per-component coverage) re-added in #190 once useHdsMotion() gave it a
# real per-component pattern to gate on — see the script header for detail.
#
# check-hardcoded-colors was archived off automatic gating in #52 (ADR-018
# §5, pre-commit friction); this re-introduces automatic gating for it via a
# different, lower-friction channel (PR-time via Ralph, not every human
# commit). docs/guardrails/registry.json's firingChannel schema has no slot
# for "also fires from ralph/gate.sh" — see #188.
run_step pnpm check:contrast
run_step pnpm check:focus
run_step pnpm check:colors
run_step pnpm check:motion

run_step pnpm typecheck
run_step pnpm test
run_step pnpm lint

echo "── gate: all green"
