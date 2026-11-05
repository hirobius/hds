/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * entry-graph-probe.mjs — the code HDS itself ships for one package entry
 * (hds#1145).
 *
 * vite.config.lib.ts keeps one output file per source module
 * (`preserveModules`), so dist/hirobius-ui.js is a list of re-exports and the
 * code lives under dist/m/. A budget over the entry file alone would measure
 * almost nothing. bundleEntryGraph bundles the entry with every package
 * import kept external: what is left is HDS's own code for that entry, the
 * number the entry budgets in .size-limit.cjs hold.
 *
 * scripts/build-button-probe.mjs writes one probe per ENTRY_GRAPHS row.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolveEsbuild } from './button-probe-esbuild.mjs';

/**
 * Each budgeted JS entry, the export statement its probe uses (manifest has
 * only a default export) and the probe file .size-limit.cjs measures.
 */
export const ENTRY_GRAPHS = [
  {
    entry: 'dist/hirobius-ui.js',
    reexport: 'export *',
    probe: 'dist/probe/hirobius-ui.graph.js',
  },
  {
    entry: 'dist/manifest.js',
    reexport: 'export { default }',
    probe: 'dist/probe/manifest.graph.js',
  },
  { entry: 'dist/tokens.js', reexport: 'export *', probe: 'dist/probe/tokens.graph.js' },
];

/**
 * Bundle `entry` (minified ESM, packages external) to `outfile`.
 *
 * @param {{entry: string, outfile: string}} paths
 * @returns {Promise<{bytes: number, gzipBytes: number}>}
 */
export async function bundleEntryGraph({ entry, outfile }) {
  const esbuild = resolveEsbuild();
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    packages: 'external',
    write: true,
    logLevel: 'silent',
  });
  const text = readFileSync(outfile);
  return { bytes: text.length, gzipBytes: gzipSync(text).length };
}
