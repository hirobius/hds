#!/usr/bin/env bash
# Feedback gate Ralph must pass before opening a PR. Red = no PR.
set -euo pipefail
cd "$(dirname "$0")/.."

# Repos WITH the loop system:
# GATE="pnpm loop:validate"
# Default:
GATE="pnpm typecheck && pnpm test && pnpm lint"

eval "$GATE"
