/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * button-probe-esbuild — the esbuild side of the Button-only probe (hds#363,
 * hds#365).
 *
 * scripts/build-button-probe.mjs bundles `import { Button } from
 * '@hirobius/design-system'` with rollup for the .size-limit.cjs budget. Rollup
 * drops a property write on an unused object; webpack and esbuild do not, so a
 * compound assembled by writing parts onto a component, or any bare top-level
 * factory call in the chunk shared with Button, keeps a whole Radix stack in a
 * consumer's Button-only bundle without the rollup number moving. This bundles
 * the same entry with esbuild — the esbuild vite already ships, so no new
 * dependency — and reports which @radix-ui packages reached the output. Only
 * the packages Button itself pulls in may (ALLOWED_PACKAGES): hds#363 forbade
 * the two dialog packages alone, and the metafile still listed 33 because six
 * more compounds wrote their parts the same way (hds#365).
 */
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * The @radix-ui packages a Button-only consumer legitimately receives: what
 * src/app/components/button.tsx imports (@radix-ui/react-slot) and that
 * package's own @radix-ui dependencies. `buttonRadixClosure` derives the same
 * list from the source and the installed tree, and the unit test pins the two
 * together, so a new @radix-ui import in Button is a deliberate change here,
 * never a silent widening.
 */
export const ALLOWED_PACKAGES = new Set(['@radix-ui/react-slot', '@radix-ui/react-compose-refs']);

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
 * Input paths from any @radix-ui package outside the allow-list that reached
 * the output, sorted.
 *
 * @param {{outputs?: Record<string, {inputs?: Record<string, unknown>}>}} metafile
 * @returns {string[]}
 */
export function disallowedInputs(metafile) {
  return outputInputs(metafile)
    .filter((p) => {
      const name = radixPackageOf(p);
      return name !== null && !ALLOWED_PACKAGES.has(name);
    })
    .sort();
}

/**
 * The @radix-ui packages outside the allow-list that reached the output, once
 * each, sorted.
 *
 * @param {{outputs?: Record<string, {inputs?: Record<string, unknown>}>}} metafile
 * @returns {string[]}
 */
export function disallowedPackages(metafile) {
  return [...new Set(disallowedInputs(metafile).map(radixPackageOf))].sort();
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

// ── Deriving the allow-list ───────────────────────────────────────────────────

const RELATIVE_IMPORT = /\bfrom\s+['"](\.[^'"]+)['"]/g;
const RADIX_IMPORT = /\bfrom\s+['"](@radix-ui\/[^'"/]+)['"]/g;

/** The source file a relative import specifier names, or null. */
function resolveLocal(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * The real directory of package `name` as resolved from `fromDir`: the nearest
 * node_modules above it (pnpm keeps a package's dependencies beside it in the
 * store, not under the project root), walking up to the filesystem root.
 */
function packageDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidates =
      path.basename(dir) === 'node_modules'
        ? [path.join(dir, name)]
        : [path.join(dir, 'node_modules', name)];
    for (const candidate of candidates) {
      if (existsSync(path.join(candidate, 'package.json'))) return realpathSync(candidate);
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`button-probe-esbuild: cannot resolve ${name} from ${fromDir}`);
    }
    dir = parent;
  }
}

/**
 * Every @radix-ui package src/app/components/button.tsx pulls in: the ones it
 * and its local imports (followed transitively) import, plus each package's
 * own @radix-ui dependencies, read from the installed package.json files.
 * Sorted. This is what ALLOWED_PACKAGES must equal.
 *
 * @param {string} root  the repo root
 * @returns {string[]}
 */
export function buttonRadixClosure(root) {
  const entry = path.join(root, 'src', 'app', 'components', 'button.tsx');
  const seenFiles = new Set();
  const imported = new Set();
  const visitFile = (file) => {
    if (seenFiles.has(file)) return;
    seenFiles.add(file);
    const source = readFileSync(file, 'utf8');
    for (const m of source.matchAll(RADIX_IMPORT)) imported.add(m[1]);
    for (const m of source.matchAll(RELATIVE_IMPORT)) {
      const next = resolveLocal(file, m[1]);
      if (next) visitFile(next);
    }
  };
  visitFile(entry);

  const closure = new Set();
  const visitPackage = (name, fromDir) => {
    if (closure.has(name)) return;
    closure.add(name);
    const dir = packageDir(name, fromDir);
    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      if (dep.startsWith('@radix-ui/')) visitPackage(dep, dir);
    }
  };
  for (const name of [...imported].sort()) visitPackage(name, root);
  return [...closure].sort();
}

// ── Bundling ──────────────────────────────────────────────────────────────────

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
 * @returns {Promise<{bytes: number, gzipBytes: number, radix: string[], disallowed: string[], metafile: object}>}
 */
export async function bundleButtonOnly({ entry, outfile }) {
  const esbuild = resolveEsbuild();
  const result = await esbuild.build(buttonOnlyEsbuildOptions({ entry, outfile }));
  const text = readFileSync(outfile);
  return {
    bytes: text.length,
    gzipBytes: gzipSync(text).length,
    radix: radixInputs(result.metafile),
    disallowed: disallowedInputs(result.metafile),
    metafile: result.metafile,
  };
}
