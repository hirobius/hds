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
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

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
} finally {
  rmSync(ENTRY, { force: true });
}
console.log('build-button-probe — wrote dist/probe/button-only.js');
