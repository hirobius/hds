#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-version-stamps — do the agent docs name the version they ship in?
 * (hds#463)
 *
 * llms.txt, public/llms.txt, public/llms-full.txt, every public/llms/*.txt
 * slice, skills/hds-consumer/SKILL.md (`metadata.hds-version`) and
 * public/hds-manifest.json (`packageVersion`) must each say package.json's
 * version. Those files ship in the tarball as committed, so a stamp that
 * differs here is a tarball that lies about itself. `pnpm changeset:version`
 * regenerates them all; by hand: `pnpm tokens`.
 *
 * Usage: node scripts/check-version-stamps.mjs [--root <dir>] [--json]
 *   --root reads another tree, such as an unpacked tarball (its package/ dir).
 * Exit: 0 = every stamp matches, 1 = drift.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emitResult, hasJsonFlag } from './lib/gate-output.mjs';
import { rootFromArgv } from './lib/generated-check.mjs';
import { stampDrift } from './lib/version-stamp.mjs';

const ROOT = rootFromArgv(join(dirname(fileURLToPath(import.meta.url)), '..'));

function main() {
  const jsonMode = hasJsonFlag(process.argv.slice(2));
  const drift = stampDrift(ROOT);
  const violations = drift.map((d) => ({
    file: d.file,
    line: null,
    rule: 'STAMP_DRIFT',
    severity: 'error',
    message: `says ${d.found ?? 'no version'}, package.json says ${d.expected}`,
  }));
  const ok = violations.length === 0;
  if (!jsonMode) {
    if (ok) console.log('✓ check-version-stamps');
    else {
      for (const v of violations) console.error(`${v.file} ${v.rule} ${v.message}`);
      console.error(
        `✗ check-version-stamps: ${violations.length} file(s) differ from package.json. Fix: pnpm tokens (or pnpm changeset:version for a release).`,
      );
    }
  }
  emitResult({ violations, summary: { files: drift.length }, ok }, jsonMode);
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
