/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * button-probe-esbuild — the esbuild side of the Button-only probe (hds#363).
 *
 * scripts/build-button-probe.mjs bundles `import { Button } from
 * '@hirobius/design-system'` with rollup for the .size-limit.cjs budget. Rollup
 * drops a property write on an unused object; webpack and esbuild do not, so a
 * compound assembled by writing parts onto a Radix Root, or any bare top-level
 * factory call in the chunk shared with Button, keeps the whole Radix dialog
 * stack in a consumer's Button-only bundle without the rollup number moving.
 * This bundles the same entry with esbuild — the esbuild vite already ships,
 * so no new dependency — and reports which @radix-ui packages reached the
 * output. `@radix-ui/react-dialog` and `@radix-ui/react-alert-dialog` must not.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';

/** Packages a Button-only consumer must never receive. */
export const FORBIDDEN_PACKAGES = new Set([
  '@radix-ui/react-dialog',
  '@radix-ui/react-alert-dialog',
]);

/**
 * The `@radix-ui/<name>` package a metafile input path belongs to, or null.
 * Matches the real package directory, not pnpm's `@radix-ui+name@version` store
 * segment (no slash follows the scope there).
 */
function radixPackageOf(inputPath) {
  const m = inputPath.match(/(?:^|\/)(@radix-ui\/[^/]+)\//);
  return m ? m[1] : null;
}

/** Every input path that reached any output in an esbuild metafile. */
function outputInputs(metafile) {
  const paths = new Set();
  for (const output of Object.values(metafile?.outputs ?? {})) {
    for (const input of Object.keys(output.inputs ?? {})) paths.add(input);
  }
  return [...paths];
}

/**
 * Input paths from a forbidden package that reached the output, sorted.
 *
 * @param {{outputs?: Record<string, {inputs?: Record<string, unknown>}>}} metafile
 * @returns {string[]}
 */
export function forbiddenInputs(metafile) {
  return outputInputs(metafile)
    .filter((p) => FORBIDDEN_PACKAGES.has(radixPackageOf(p) ?? ''))
    .sort();
}

/**
 * Every `@radix-ui/*` package that reached the output, once each, sorted.
 *
 * @param {{outputs?: Record<string, {inputs?: Record<string, unknown>}>}} metafile
 * @returns {string[]}
 */
export function radixInputs(metafile) {
  const names = new Set();
  for (const p of outputInputs(metafile)) {
    const name = radixPackageOf(p);
    if (name) names.add(name);
  }
  return [...names].sort();
}

/**
 * The esbuild vite depends on. It is not a direct dependency of this package
 * and pnpm does not hoist it, so it resolves from vite's own location.
 */
export function resolveEsbuild() {
  const here = createRequire(import.meta.url);
  const fromVite = createRequire(here.resolve('vite/package.json'));
  return fromVite('esbuild');
}

/**
 * Build options for a consumer-like bundle: minified, tree-shaken ESM for the
 * browser, peers external (a consumer installs those), everything the package
 * depends on bundled — the radix packages included, which is the point.
 *
 * @param {{entry: string, outfile: string}} paths
 */
export function buttonOnlyEsbuildOptions({ entry, outfile }) {
  return {
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    metafile: true,
    write: true,
    logLevel: 'silent',
    external: [
      'react',
      'react/*',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/*',
      'react-dom/client',
      'react-router',
      'react-router/*',
      'react-hook-form',
      'zod',
      '@hookform/*',
      'lenis',
      'lenis/*',
    ],
  };
}

/**
 * Bundle `entry` with esbuild into `outfile` and describe what got in.
 *
 * @param {{entry: string, outfile: string}} paths
 * @returns {Promise<{bytes: number, gzipBytes: number, radix: string[], forbidden: string[], metafile: object}>}
 */
export async function bundleButtonOnly({ entry, outfile }) {
  const esbuild = resolveEsbuild();
  const result = await esbuild.build(buttonOnlyEsbuildOptions({ entry, outfile }));
  const text = readFileSync(outfile);
  return {
    bytes: text.length,
    gzipBytes: gzipSync(text).length,
    radix: radixInputs(result.metafile),
    forbidden: forbiddenInputs(result.metafile),
    metafile: result.metafile,
  };
}
