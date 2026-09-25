#!/usr/bin/env bash
# Vercel build for the Nextra POC: build the local design-system package at
# the repo root, then install and build this app (it depends on it via file:../..).
set -euo pipefail
cd ../..
# Vercel ships pnpm 6 on PATH; run the repo's pinned version instead.
npm install --silent --prefix /tmp/pnpm-pinned pnpm@10.33.0
export PATH="/tmp/pnpm-pinned/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm build:lib
cd docs-poc/nextra
npm install
npm run build
