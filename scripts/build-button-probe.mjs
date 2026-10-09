#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-button-probe.mjs — build the bundle a consumer gets from
 * `import { Button } from '@hirobius/design-system'`, for the size budget.
 *
 * Bundles a one-line entry that re-exports Button from the built root entry
 * (dist/hirobius-ui.js), tree-shaken and minified the way a consumer's bundler
 * would, with the peers (react, react-dom) external. The output,
 * dist/probe/button-only.js, is what .size-limit.cjs measures. Runs after
 * `pnpm build:lib` inside `pnpm check:size`; it needs dist/, which is why the
 * budget fires on ci-pr and not in `pretest`.
 *
 * The same entry is then bundled with esbuild (scripts/lib/button-probe-esbuild.mjs,
 * hds#363) into dist/probe/button-only.esbuild.js. Rollup drops a property
 * write on an unused object; webpack and esbuild keep it, so the rollup number
 * alone missed a compound assembled by writing parts onto a Radix Root. This
 * exits 1 if any @radix-ui package outside the allow-list — the packages
 * button.tsx itself pulls in (ALLOWED_PACKAGES) — reaches the esbuild bundle,
 * and prints every package that did (hds#365: the earlier "no dialog packages"
 * check passed while 33 @radix-ui packages still got in). It lives here rather
 * than in a sibling script so it runs in the CI "Bundle budgets" step, which
 * calls this file by name.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { PERF_BUDGET_HINT } from './lib/perf-budget-hint.mjs';
import {
  ALLOWED_PACKAGES,
  bundleButtonOnly,
  disallowedPackages,
} from './lib/button-probe-esbuild.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PROBE_DIR = join(DIST, 'probe');
const ENTRY = join(PROBE_DIR, 'entry.js');

if (!existsSync(join(DIST, 'hirobius-ui.js'))) {
  console.error('build-button-probe: dist/hirobius-ui.js is missing. Run `pnpm build:lib` first.');
  process.exit(1);
}

rmSync(PROBE_DIR, { recursive: true, force: true });
mkdirSync(PROBE_DIR, { recursive: true });
writeFileSync(ENTRY, "export { Button } from '../hirobius-ui.js';\n");

let esbuildProbe;
try {
  await build({
    root: ROOT,
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    build: {
      outDir: PROBE_DIR,
      emptyOutDir: false,
      minify: 'esbuild',
      cssCodeSplit: false,
      lib: { entry: ENTRY, formats: ['es'], fileName: () => 'button-only.js' },
      rollupOptions: {
        external: [/^react($|\/)/, /^react-dom($|\/)/],
        output: { inlineDynamicImports: true },
        // Third-party 'use client' directives are irrelevant to a size probe.
        onwarn(warning, warn) {
          if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
        },
      },
    },
  });
  console.log(
    'build-button-probe — wrote dist/probe/button-only.js (rollup; size-limit measures it)',
  );

  esbuildProbe = await bundleButtonOnly({
    entry: ENTRY,
    outfile: join(PROBE_DIR, 'button-only.esbuild.js'),
  });
  writeFileSync(
    join(PROBE_DIR, 'button-only.esbuild.meta.json'),
    JSON.stringify(esbuildProbe.metafile, null, 2),
  );
  console.log(
    `build-button-probe — wrote dist/probe/button-only.esbuild.js (esbuild; ` +
      `${(esbuildProbe.bytes / 1024).toFixed(2)} kB raw, ${(esbuildProbe.gzipBytes / 1024).toFixed(2)} kB gzip; ` +
      `@radix-ui packages reached: ${esbuildProbe.radix.length ? esbuildProbe.radix.join(', ') : 'none'})`,
  );
} finally {
  rmSync(ENTRY, { force: true });
}

// After `finally`, so the temp entry is gone on failure too (process.exit skips it).
if (esbuildProbe.disallowed.length > 0) {
  const offenders = disallowedPackages(esbuildProbe.metafile);
  console.error(
    `\n✗ build-button-probe — a Button-only consumer bundled with esbuild receives code from ` +
      `${offenders.length} @radix-ui package(s) Button does not need (hds#363, hds#365):\n`,
  );
  for (const name of offenders) console.error(`    ${name}`);
  console.error(
    `\n  allowed (what src/app/components/button.tsx pulls in): ${[...ALLOWED_PACKAGES].sort().join(', ')}` +
      `\n  reached: ${esbuildProbe.radix.join(', ')}\n\n  inputs that got in:`,
  );
  for (const input of esbuildProbe.disallowed) console.error(`    ${input}`);
  console.error(
    '\n  fix: something in the chunk shared with Button keeps that stack alive —\n' +
      '  a bare top-level factory call (node scripts/check-pure-annotations.mjs), a\n' +
      '  `X.Part = …` or `X.displayName = …` write, or an un-annotated Object.assign.\n' +
      '  dist/probe/button-only.esbuild.meta.json lists every input that got in.',
  );
  console.error(`\n${PERF_BUDGET_HINT}`);
  process.exit(1);
}
