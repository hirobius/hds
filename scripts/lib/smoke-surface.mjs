/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/lib/smoke-surface.mjs — what scripts/smoke-consumer.mjs covers (hds#458).
 *
 * - smokeSubpaths: the resolve and import lists, read from package.json#exports
 *   so a new subpath is smoked the day it ships.
 * - auditDistImports: every bare specifier in dist/*.js and dist/chunks/*.js is a
 *   dependency or a peer, and an optional peer is reachable only from its own
 *   subpath (a root import must not need react-hook-form).
 * - importEverySubpath: imports each JS subpath in a clean Node process with no
 *   `window`, so a top-level browser global breaks the run (SSR, tests, RSC).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';

/** The oldest TypeScript a consumer may compile with. CONSUMING.md states it. */
export const TS_FLOOR = '5.6.3';

/** Each optional peer and the only subpaths whose import graph may reach it. */
export const OPTIONAL_PEER_SUBPATHS = {
  'react-hook-form': ['./form'],
  '@hookform/resolvers': ['./form'],
  zod: ['./form'],
  lenis: ['./scroll'],
  // The router seam takes a LinkComponent; no bundle imports react-router.
  'react-router': [],
};

function jsTarget(value) {
  if (typeof value === 'string') return /\.m?js$/.test(value) ? value : null;
  if (value && typeof value === 'object') return jsTarget(value.import ?? value.default);
  return null;
}

/** `{ resolve, imports }`: every exports key, and the keys whose target is JS. */
export function smokeSubpaths(pkg) {
  const keys = Object.keys(pkg.exports ?? {}).filter((k) => !k.includes('*'));
  return { resolve: keys, imports: keys.filter((k) => jsTarget(pkg.exports[k])) };
}

export function packageNameOf(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

// A keyword that is not a property or a string ("import" in a keyword list),
// and a specifier with no whitespace or comma in it.
const SPECIFIER =
  /(?<![\w$."'])(?:import|export)\s*(?:[\w*${}\s,]+?\s*from\s*)?["']([^"'\s,]+)["']|(?<![\w$."'])import\s*\(\s*["']([^"'\s,]+)["']\s*\)/g;

function specifiers(source) {
  return [...source.matchAll(SPECIFIER)].map((m) => m[1] ?? m[2]);
}

/** The bare (package) specifiers a built module imports. */
export function bareSpecifiers(source) {
  return specifiers(source).filter((s) => !s.startsWith('.') && !s.startsWith('/'));
}

const BUILTINS = new Set(builtinModules);
const isBuiltin = (s) => s.startsWith('node:') || BUILTINS.has(packageNameOf(s));

/** Problems (strings) with the bare imports of a built package at `root`. */
export function auditDistImports(root, pkg, peerSubpaths = OPTIONAL_PEER_SUBPATHS) {
  const dist = join(root, 'dist');
  const files = [dist, join(dist, 'chunks')]
    .filter((d) => existsSync(d))
    .flatMap((d) =>
      readdirSync(d)
        .filter((f) => f.endsWith('.js'))
        .map((f) => join(d, f)),
    );
  const source = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ]);
  const optional = new Set(
    Object.entries(pkg.peerDependenciesMeta ?? {})
      .filter(([, m]) => m?.optional)
      .map(([name]) => name),
  );
  const problems = [];
  const rel = (f) => relative(root, f).split('\\').join('/');

  for (const [file, text] of source) {
    for (const spec of bareSpecifiers(text)) {
      if (isBuiltin(spec)) continue;
      const name = packageNameOf(spec);
      if (!declared.has(name)) {
        problems.push(`${rel(file)} imports "${spec}", which is not a dependency or peer`);
      } else if (optional.has(name) && !(name in peerSubpaths)) {
        problems.push(
          `${rel(file)} imports optional peer ${name}, which OPTIONAL_PEER_SUBPATHS does not map to a subpath`,
        );
      }
    }
  }

  // Walk each JS subpath's relative-import graph and check the optional peers it reaches.
  for (const key of smokeSubpaths(pkg).imports) {
    const target = resolve(root, jsTarget(pkg.exports[key]));
    if (!source.has(target)) continue; // tooling entries outside dist
    const seen = new Set();
    const stack = [target];
    while (stack.length) {
      const file = stack.pop();
      if (seen.has(file) || !source.has(file)) continue;
      seen.add(file);
      for (const spec of specifiers(source.get(file))) {
        if (spec.startsWith('.')) {
          stack.push(resolve(dirname(file), spec));
          continue;
        }
        const name = packageNameOf(spec);
        const allowed = peerSubpaths[name];
        if (optional.has(name) && allowed && !allowed.includes(key)) {
          problems.push(
            `optional peer ${name} is reachable from "${key}" (via ${rel(file)}); allowed only from ${allowed.join(', ') || 'no subpath'}`,
          );
        }
      }
    }
  }
  return problems;
}

/**
 * Import `subpaths` of `pkgName` from `cwd` in a fresh Node process with no
 * browser globals. Returns `{ failures, passed }` (full specifiers).
 */
export function importEverySubpath(cwd, pkgName, subpaths) {
  const specs = subpaths.map((s) => (s === '.' ? pkgName : pkgName + s.slice(1)));
  const script = `
const out = { failures: [], passed: [] };
if (typeof window !== 'undefined' || typeof document !== 'undefined') {
  out.failures.push('the probe process has browser globals');
}
for (const spec of ${JSON.stringify(specs)}) {
  try { await import(spec); out.passed.push(spec); }
  catch (err) { out.failures.push(spec + ': ' + (err && err.message)); }
}
console.log(JSON.stringify(out));
`;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd,
    encoding: 'utf8',
  });
  try {
    return JSON.parse(res.stdout.trim().split('\n').pop());
  } catch {
    return { failures: [`import probe crashed: ${res.stderr || res.stdout}`], passed: [] };
  }
}
