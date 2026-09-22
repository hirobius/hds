#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-published-types — are the types we publish actually resolvable?
 *
 * Runs `attw` (@arethetypeswrong/cli) over the packed tarball, which is the
 * only thing that sees what a consumer sees. Nothing else in this repo does:
 * `tsc` typechecks `src/`, every test imports `src/`, and `smoke:consumer`
 * proves each subpath IMPORTS cleanly — none of them resolve the emitted
 * `.d.ts` the way a `moduleResolution: node16` consumer would.
 *
 * That gap shipped a real defect. `tsconfig.dts.json` compiles with
 * `moduleResolution: "Node"`, so tsc emitted 150 extensionless relative
 * specifiers into a `"type": "module"` package, and every one failed to
 * resolve under node16 — broken types across 7 entry points, with CI green.
 * `add-dts-extensions.mjs` fixes the emit; this gate is what stops it coming
 * back.
 *
 * PROFILE — `esm-only`, deliberately. This package is `"type": "module"` with
 * no CommonJS build, so two attw findings are design, not regressions:
 *   - node10 cannot read `exports`, so every subpath "fails" there.
 *   - node16-from-CJS requires a dynamic import, which is what ESM-only means.
 * `--profile esm-only` ignores exactly those two and leaves node16-from-ESM
 * and bundler, which are the consumers we actually have. Dropping the profile
 * would make this gate permanently red, and a gate that is always red gets
 * deleted.
 *
 * EXCLUDED ENTRY POINTS — the four CSS subpaths. They resolve to stylesheets,
 * which have no types and no JavaScript, so attw reports NoResolution for
 * something working exactly as intended. `smoke:consumer` already proves they
 * resolve.
 *
 * Usage: node scripts/check-published-types.mjs
 * Exit codes: 0 = types resolve for every checked entry point, 1 = they do not.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Stylesheet subpaths: real exports with nothing for attw to resolve. */
const CSS_ENTRYPOINTS = ['tokens.css', 'styles.css', 'variables.css', 'static.css'];

function main() {
  const types = path.join(ROOT, 'dist', 'types');
  if (!existsSync(types)) {
    console.error(
      'check-published-types: dist/types does not exist.\n' +
        '  Run `pnpm build:lib` (or `pnpm build:types`) first — this gate reads the\n' +
        '  built output, not src/.',
    );
    process.exit(1);
  }

  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'attw',
      '--pack',
      '.',
      '--profile',
      'esm-only',
      '--exclude-entrypoints',
      ...CSS_ENTRYPOINTS,
    ],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );

  const output = `${result.stdout || ''}${result.stderr || ''}`;

  if (result.error) {
    console.error(
      `check-published-types: could not run attw — ${result.error.message}\n` +
        '  @arethetypeswrong/cli is a devDependency; run `pnpm install`.',
    );
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(output.trimEnd());
    console.error(
      '\n✗ check-published-types — the published types do not resolve for a\n' +
        '  node16/nodenext ESM consumer. This is invisible to tsc and to the unit\n' +
        '  tests, because both read src/. Look at the emit, not the source:\n' +
        '    pnpm build:types && pnpm exec attw --pack . --profile esm-only\n' +
        '  An InternalResolutionError usually means a specifier lost its extension —\n' +
        '  see scripts/add-dts-extensions.mjs.',
    );
    process.exit(1);
  }

  console.log('✓ check-published-types — types resolve for node16 (ESM) and bundler consumers.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
