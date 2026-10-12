#!/usr/bin/env bash
# ralph/test.sh — test-only runner for the kit's red-first check (ops#504, hds#568).
# The kit checks out the branch's FIRST test-touching commit in a bare
# `git worktree` and runs this; non-zero = red (good), zero = the new test
# already passed (a red-first violation: warns until 2026-10-21, then blocks —
# RALPH_TDD_ENFORCE_AFTER in lib.sh).
#
# gate.sh can't do this job: a bare worktree has no node_modules, so
# `pnpm typecheck` died there and every check read as "red". This runner
# borrows the main checkout's node_modules (installs only if there are none)
# and runs just the vitest files that commit touched.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -e node_modules ]; then
  main=$(cd "$(git rev-parse --git-common-dir)/.." && pwd)
  if [ "$main" != "$PWD" ] && [ -d "$main/node_modules" ]; then
    ln -s "$main/node_modules" node_modules
  else
    pnpm install --frozen-lockfile --prefer-offline >&2
  fi
fi

# Same globs as vitest.config.ts `include`.
files=$(git diff-tree --no-commit-id --name-only -r --diff-filter=AM HEAD |
  grep -E '^scripts/(eslint-plugin-hds/)?__tests__/.*\.(test|spec)\.mjs$|^src/.*\.(test|spec)\.(ts|tsx|js|jsx)$|^tests/.*\.test\.(ts|tsx)$' |
  sort || true)
if [ -z "$files" ]; then
  echo "ralph/test.sh: no vitest test file in $(git rev-parse --short HEAD) — can't judge red-first" >&2
  exit 3
fi

# shellcheck disable=SC2086 # one path per word; repo paths carry no spaces
exec node_modules/.bin/vitest run $files
