#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Activates Husky as the repo's hook path.
 * Runs automatically on `pnpm install` via the "prepare" script.
 *
 * Hook tier:
 *   pre-commit → pnpm typecheck
 *   pre-push   → pnpm check:full + test:a11y + heal + visual parity ingest
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import installHusky from 'husky';

const ROOT      = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS_DIR = join(ROOT, '.git');

if (!existsSync(HOOKS_DIR)) {
  // Not a git repo (e.g. CI artifact unzip) — skip silently.
  process.exit(0);
}

// `prepare` runs on install AND on `npm publish` / `npm pack`. In CI (and any
// environment that sets HUSKY=0 to disable git hooks — e.g. the changesets
// release job) husky's installer intentionally skips. That is a SKIP, not a
// failure, so we must exit 0 — otherwise `npm publish` aborts in its prepare
// step. Mirrors the graceful-degradation contract of check-secrets.mjs.
if (process.env.HUSKY === '0') {
  console.log('Husky disabled (HUSKY=0) — skipping git hook install.');
  process.exit(0);
}

try {
  process.chdir(ROOT);
  // husky() returns "" on success and a non-empty message string when it
  // skips (HUSKY=0, CI, no git dir); it throws only on a real error. Treat a
  // returned skip message as informational, not fatal.
  const result = installHusky('.husky');
  if (result) {
    console.log(`Husky: ${String(result).trim()}`);
    process.exit(0);
  }
  console.log('✓ git hooks activated (.husky/)');
} catch (err) {
  console.error('✗ Failed to initialize Husky:', err.message);
  process.exit(1);
}
