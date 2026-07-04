#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/mojibake.mjs
 *
 * Wrapper for the editorconfig-checker charset / utf-8 gate (`check:mojibake`).
 *
 * Mirrors scripts/check-secrets.mjs' degradation contract: the npm
 * editorconfig-checker wrapper downloads a Go binary from GitHub releases on
 * first run, which 403s in network-restricted environments (remote agent
 * sessions, offline CI mirrors). When the binary cannot be OBTAINED that is a
 * SKIP — not a failure — so the pre-commit / pre-push hook no longer forces a
 * `--no-verify` bypass just to get past an unreachable download (#18 / #52).
 * The gate still runs, and still fails on real mojibake, anywhere the binary
 * is present (CI with network, local dev).
 *
 * EC_VERSION is pinned to the version the npm wrapper expects — see the
 * package.json `#_comment:editorconfig-version` note. Bump both together.
 *
 * Exit: 0 = clean or skipped; non-zero = real charset violations found.
 */

import { spawnSync } from 'node:child_process';

const EC_VERSION = 'v3.7.0';

const res = spawnSync('pnpm', ['exec', 'editorconfig-checker'], {
  env: { ...process.env, EC_VERSION },
  encoding: 'utf8',
});

const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;

// Signatures of "the binary could not be fetched/spawned" — emitted by the npm
// wrapper's download step, NOT by editorconfig-checker's own charset findings
// (which print `file:line` violations). Kept narrow so a real violation is
// never misread as a skip.
const BINARY_UNAVAILABLE =
  /Failed to download binary|not enabled for this session|access to this repository is not enabled|HttpError|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i;

const spawnFailed = res.error?.code === 'ENOENT';
const downloadBlocked = res.status !== 0 && BINARY_UNAVAILABLE.test(output);

if (spawnFailed || downloadBlocked) {
  console.warn(
    'check-mojibake: editorconfig-checker binary unavailable (network-restricted) — ' +
      'skipping the charset scan. The gate still enforces where the binary is present (CI, local dev).',
  );
  process.exit(0);
}

// Real run: surface the checker's output and propagate its verdict.
if (output.trim()) {
  process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
}
process.exit(res.status ?? 0);
