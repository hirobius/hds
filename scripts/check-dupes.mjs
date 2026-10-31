#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-dupes.mjs
 *
 * Duplication ratchet (hds#766): runs jscpd over the hand-written tree
 * (src, scripts, tests, validators) and fails when the duplicated-line
 * percentage rises above the `threshold` in .jscpd.json. The threshold is
 * the count measured the day the gate landed (1.883% on 2026-10-31, so
 * the threshold sits at 1.84 after hds#1008) and only ever moves down — lower it in the
 * same PR that removes clones. Generated files, fixtures and golden
 * files are ignored in .jscpd.json: they are inputs and outputs, not
 * code anyone can deduplicate.
 *
 * The jscpd binary is resolved from this repo's node_modules (never the
 * caller's working directory), while the scanned paths and the
 * .jscpd.json config resolve against the caller's directory — the test
 * suite uses that to run the gate against fixture trees.
 *
 * On-demand channel: run by hand during cleanup sweeps (`pnpm check:dupes`),
 * not wired into a hook. Extra args pass through to jscpd, e.g.
 * `node scripts/check-dupes.mjs --reporters console,json --output report/`
 * for the clone inventory behind docs/cleanup/DELETE-LIST.md.
 *
 * Exit: jscpd's own code (0 = at or under threshold); 1 when the binary
 * is missing (run `pnpm install` — jscpd is a devDependency).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSCPD_BIN = join(ROOT, 'node_modules', '.bin', 'jscpd');
const PATHS = ['src', 'scripts', 'tests', 'validators'];

if (!existsSync(JSCPD_BIN)) {
  console.error(
    'check-dupes: jscpd is not installed. Run `pnpm install` (jscpd is a devDependency).',
  );
  process.exit(1);
}

const res = spawnSync(JSCPD_BIN, [...PATHS, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (res.error) {
  console.error(`check-dupes: could not run jscpd: ${res.error.message}`);
  process.exit(1);
}

process.exit(res.status ?? 1);
