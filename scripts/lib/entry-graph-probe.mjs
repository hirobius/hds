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
 * Each budgeted JS entry, the export statements its probe uses (every name
 * the entry exports: `export *` skips a default export) and the probe file
 * .size-limit.cjs measures. A row with `exclude` re-exports every name the
 * entry has but those (read with entryExportNames), and a row with
 * `forbidInputs` fails the probe build when a dist module whose path ends
 * with one of them reaches the graph.
 */
export const ENTRY_GRAPHS = [
  {
    entry: 'dist/hirobius-ui.js',
    reexports: ['export *'],
    probe: 'dist/probe/hirobius-ui.graph.js',
  },
  {
    // hds#1205: the root without its deprecated token copies (`hds`, `tokens`,
    // removed in 0.35.0), so the components a root import brings in are
    // budgeted apart from the token JSON, and the JSON can never ride along.
    entry: 'dist/hirobius-ui.js',
    exclude: ['hds', 'tokens'],
    forbidInputs: ['hirobius.tokens.json.js'],
    probe: 'dist/probe/hirobius-ui.components.graph.js',
  },
  {
    entry: 'dist/manifest.js',
    reexports: ['export { default }'],
    probe: 'dist/probe/manifest.graph.js',
  },
  {
    // The token bridge without the raw DTCG JSON (`tokens`, budgeted below).
    entry: 'dist/tokens.js',
    exclude: ['tokens'],
    forbidInputs: ['hirobius.tokens.json.js'],
    probe: 'dist/probe/tokens.graph.js',
  },
  {
    entry: 'dist/tokens.js',
    reexports: ['export { tokens }'],
    probe: 'dist/probe/tokens-json.graph.js',
  },
  {
    // hds#1433: Sheet on its own subpath, for an app with a tight entry budget.
    // It must not drag the token JSON in through a Dialog part.
    entry: 'dist/sheet.js',
    reexports: ['export *'],
    forbidInputs: ['hirobius.tokens.json.js'],
    probe: 'dist/probe/sheet.graph.js',
  },
];

/**
 * The names `entry` exports (`default` included), read from an esbuild
 * metafile of the entry bundled with packages external.
 *
 * @param {string} entry
 * @returns {Promise<string[]>}
 */
export async function entryExportNames(entry) {
  const esbuild = resolveEsbuild();
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    packages: 'external',
    write: false,
    metafile: true,
    outdir: 'out',
    logLevel: 'silent',
  });
  const [output] = Object.values(result.metafile.outputs).filter((o) => o.entryPoint);
  return [...output.exports].sort();
}

/** The export statements a row's probe stub uses (see ENTRY_GRAPHS). */
export async function probeReexports(row, root) {
  if (!row.exclude) return row.reexports;
  const names = (await entryExportNames(`${root}/${row.entry}`)).filter(
    (n) => !row.exclude.includes(n),
  );
  return [`export { ${names.join(', ')} }`];
}

/**
 * Bundle `entry` (minified ESM, packages external) to `outfile`.
 *
 * @param {{entry: string, outfile: string}} paths
 * @returns {Promise<{bytes: number, gzipBytes: number, inputs: string[]}>}
 */
export async function bundleEntryGraph({ entry, outfile }) {
  const esbuild = resolveEsbuild();
  const result = await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    packages: 'external',
    write: true,
    metafile: true,
    logLevel: 'silent',
  });
  const text = readFileSync(outfile);
  return {
    bytes: text.length,
    gzipBytes: gzipSync(text).length,
    // Modules with code in the output: the metafile's top-level `inputs` also
    // lists modules esbuild parsed and then tree-shook away.
    inputs: Object.values(result.metafile.outputs).flatMap((o) =>
      Object.entries(o.inputs)
        .filter(([, i]) => i.bytesInOutput > 0)
        .map(([name]) => name),
    ),
  };
}
