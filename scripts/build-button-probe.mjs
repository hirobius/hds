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
 * exits 1 if any @radix-ui/react-dialog or @radix-ui/react-alert-dialog code
 * reaches the esbuild bundle. It lives here rather than in a sibling script so
 * it runs in the CI "Bundle budgets" step, which calls this file by name.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { bundleButtonOnly, FORBIDDEN_PACKAGES } from './lib/button-probe-esbuild.mjs';

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
if (esbuildProbe.forbidden.length > 0) {
  console.error(
    `\n✗ build-button-probe — a Button-only consumer bundled with esbuild receives ` +
      `${[...FORBIDDEN_PACKAGES].join(' / ')} code (hds#363):\n`,
  );
  for (const input of esbuildProbe.forbidden) console.error(`    ${input}`);
  console.error(
    '\n  fix: something in the chunk shared with Button keeps the dialog stack alive —\n' +
      '  a bare top-level factory call (node scripts/check-pure-annotations.mjs), a\n' +
      '  `X.Part = …` or `X.displayName = …` write, or an un-annotated Object.assign.\n' +
      '  dist/probe/button-only.esbuild.meta.json lists every input that got in.',
  );
  process.exit(1);
}
