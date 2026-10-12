#!/usr/bin/env bash
# ralph/check-tests.sh <base> <head> — consumer hook for the kit's tests-with-code
# gate (ops#504). Wraps the pre-push TDD gate (scripts/check-tests-with-code.mjs),
# which diffs HEAD against its merge-base with origin/main, so <base>/<head> are
# accepted but unused.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/check-tests-with-code.mjs
