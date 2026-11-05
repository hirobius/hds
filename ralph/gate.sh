#!/usr/bin/env bash
# Feedback gate Ralph must pass before opening a PR. Red = no PR — the gate
# FAILS CLOSED: any step failing aborts immediately and names the culprit.
set -euo pipefail
cd "$(dirname "$0")/.."

run_step() {
  echo "── gate: $1"
  if ! bash -c "$1"; then
    echo "── gate FAILED at: $1 — no PR, no done. Fix the change until green." >&2
    exit 1
  fi
}

# The steps live in docs/guardrails/registry.json, lane "ralph-gate" (hds#1095),
# beside check:fast, check:full and pretest. Read them first so a missing lane
# or broken registry fails here (set -e), never as an empty "all green" run.
STEPS_TXT="$(node scripts/run-lane.mjs ralph-gate --dry-run)"
mapfile -t STEPS <<<"$STEPS_TXT"
if [ -z "$STEPS_TXT" ] || [ "${#STEPS[@]}" -eq 0 ]; then
  echo "── gate FAILED: the ralph-gate lane is empty — no PR, no done." >&2
  exit 1
fi

# Why the lane is in this order (it is the ONLY per-repo part of the gate):
#
# 1. design-system: manifest:generate + audit-tokens --full first materialize
#    the gitignored-but-imported src/app/data/{component-api,token-audit-report}.json
#    a fresh clone lacks, else typecheck fails (the #138 fresh-clone bootstrap).
#
# 2. Design gates (#181): a curated, cheap, high-signal slice of `check:full`
#    (contrast, focus, colors, motion) — NOT the whole suite (that's
#    check:release territory) — so a contrast/focus regression blocks
#    auto-merge without materially slowing the gate. Each was confirmed green
#    on clean main before being wired in; each runs in well under a second.
#    check-tier-bypass (#186) and check-page-shell (#187) are still out: red on
#    clean main, or (page-shell) targeting a directory deleted in the ADR-018
#    Storybook migration. check-reduced-motion (#185) gates Layer 1 (CSS
#    @media prefers-reduced-motion) plus Layer 2 (per-component useHdsMotion(),
#    #190). check-hardcoded-colors was archived off automatic gating in #52
#    (ADR-018 §5, pre-commit friction); this lane gates it at PR time via Ralph
#    instead of every human commit (registry slot: firingChannels, #188).
#
# 3. typecheck, then the test stage (#1090): scripts/lib/test-lanes.mjs, the
#    same selection the pre-push full tier uses — pretest + only the tests the
#    diff reaches; fails safe to the whole suite on shared config, tokens,
#    generators, test setup or the gate mechanism. Then lint.
for step in "${STEPS[@]}"; do
  run_step "$step"
done

echo "── gate: all green"
