#!/usr/bin/env bash
# Feedback gate Ralph must pass before opening a PR. Red = no PR.
set -euo pipefail
cd "$(dirname "$0")/.."

# Repos WITH the loop system:
# GATE="pnpm loop:validate"
# design-system: manifest:generate first materializes the gitignored
# src/app/data/component-api.json a fresh clone lacks, else typecheck fails
# (the #138 fresh-clone bootstrap). Then the standard trio.
GATE="pnpm manifest:generate && pnpm typecheck && pnpm test && pnpm lint"

eval "$GATE"
