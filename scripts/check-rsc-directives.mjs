#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-rsc-directives — does every built React chunk say `'use client'`, and
 * does every framework-free chunk stay silent?
 *
 * The package ships React hooks and CONSUMING.md advertises Next.js. In the
 * App Router a module without `'use client'` is a Server Component, and a
 * Server Component that calls a hook fails at render — so before this gate,
 * the first `import { Button } from '@hirobius/design-system'` in a Next.js
 * page threw, and nothing here could see it: every test imports `src/`, and
 * `smoke:consumer` builds with Vite, which has no server/client boundary.
 *
 * Both directions are checked. Missing directives break Next.js; SPURIOUS
 * directives break the framework-free subpaths (`brand`, `tokens`, `cn`,
 * `manifest`, `mui`), whose exports would become opaque client references
 * when imported from server or edge code. A blanket banner would trade one
 * defect for the other.
 *
 * The rule is re-derived from the emitted files by
 * scripts/lib/rsc-directive.mjs — the same module the build plugin uses, but
 * reading `dist/` rather than trusting the plugin ran.
 *
 * Reads the built output, so it runs after `build:lib`: from `smoke:consumer`,
 * which CI invokes. Not a hook; it needs a build.
 *
 * Usage: node scripts/check-rsc-directives.mjs
 * Exit codes: 0 = every chunk is correctly marked, 1 = at least one is not.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditDist, DIRECTIVE } from './lib/rsc-directive.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

function main() {
  if (!existsSync(DIST)) {
    console.error(
      'check-rsc-directives: dist/ does not exist.\n' +
        '  Run `pnpm build:lib` first — this gate reads the built output, not src/.',
    );
    process.exit(1);
  }

  const { missing, spurious, scanned } = auditDist(DIST);

  if (scanned === 0) {
    console.error(
      'check-rsc-directives: no .js files under dist/ — nothing was built, so nothing is proven.',
    );
    process.exit(1);
  }

  if (missing.length === 0 && spurious.length === 0) {
    console.log(
      `✓ check-rsc-directives — ${scanned} chunk(s) checked; every React chunk carries ${DIRECTIVE}, no framework-free chunk does.`,
    );
    return;
  }

  if (missing.length > 0) {
    console.error(
      `✗ check-rsc-directives — ${missing.length} React chunk(s) lack ${DIRECTIVE}. A Next.js App Router\n` +
        '  consumer importing any of these gets a Server Component that calls hooks and fails at render:\n' +
        missing.map((f) => `    dist/${f}`).join('\n'),
    );
  }
  if (spurious.length > 0) {
    console.error(
      `✗ check-rsc-directives — ${spurious.length} framework-free chunk(s) carry ${DIRECTIVE}. Their exports\n` +
        '  become opaque client references when imported from server or edge code:\n' +
        spurious.map((f) => `    dist/${f}`).join('\n'),
    );
  }
  console.error(
    '\n  The directive is decided per chunk by scripts/lib/rsc-directive.mjs and applied by the\n' +
      '  rsc-directive plugin in vite.config.lib.ts. If a chunk newly imports React, the plugin\n' +
      '  marks it on the next build; if this is red, the plugin is not running or was bypassed.',
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
