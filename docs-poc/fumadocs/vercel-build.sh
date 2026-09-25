#!/usr/bin/env bash
# Vercel build for the Fumadocs POC: build the local design-system package,
# pack it, and install that tarball into this app before `next build`.
set -euo pipefail
cd ../..
# Vercel ships pnpm 6 on PATH; run the repo's pinned version instead.
npm install --silent --prefix /tmp/pnpm-pinned pnpm@10.33.0
export PATH="/tmp/pnpm-pinned/node_modules/.bin:$PATH"
pnpm install --frozen-lockfile
pnpm build:lib
mkdir -p docs-poc/fumadocs/.pkg
npm pack --pack-destination docs-poc/fumadocs/.pkg
mv docs-poc/fumadocs/.pkg/hirobius-design-system-*.tgz docs-poc/fumadocs/.pkg/hirobius-design-system.tgz
cd docs-poc/fumadocs
npm install
npm run build
