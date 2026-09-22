/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * rsc-directive — decide which built chunks need `'use client'`, and check it.
 *
 * WHY. This package ships React hooks (20 `useState` calls in the main
 * barrel) and CONSUMING.md advertises Next.js. In the App Router every module
 * is a Server Component until it says otherwise, and a Server Component that
 * calls a hook fails at render. Without the directive, the first
 * `import { Button } from '@hirobius/design-system'` in a Next.js page throws.
 * No consumer had hit it because ops is Vite and site-engine is Astro, which
 * is exactly why a prospective user would have found it before we did.
 *
 * WHY NOT A BLANKET BANNER. `'use client'` does more than permit hooks: it
 * makes every export of that module a client REFERENCE when imported from
 * server code. `brand`, `tokens`, `cn`, `manifest` and `mui` are framework-
 * free by design — vite.config.lib.ts documents `brand` as "for a static Astro
 * build or edge runtime". Stamping them would turn `tokens.color.primary` into
 * an opaque proxy on the server. So the decision is per chunk, and both
 * directions matter.
 *
 * THE RULE. A chunk needs the directive iff it imports React itself
 * (`react`, `react/jsx-runtime`, `react-dom`, …) or imports an internal chunk
 * that does — transitively. The second clause is what covers `form.js`, which
 * imports only `react-hook-form` and a shared chunk; the chunk is where React
 * is, and a Server Component importing from `form.js` still has to cross a
 * client boundary somewhere.
 *
 * WHERE IT RUNS. `applyDirectives` is called from a Rollup `generateBundle`
 * hook in vite.config.lib.ts — after minification, so the directive cannot be
 * stripped, and with the whole bundle in hand, so the transitive rule can be
 * computed. `auditDist` is the standing gate over the emitted `dist/`
 * (scripts/check-rsc-directives.mjs) and re-derives the same rule from the
 * files alone, so it does not trust the plugin that produced them.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const DIRECTIVE = `'use client';`;

/**
 * Specifiers that mean "this chunk executes React code".
 *
 * Deliberately narrow: `react-hook-form`, `react-router`, `@radix-ui/react-*`
 * and friends are React-based, but whether a chunk that names them runs React
 * is decided by whether THAT chunk (or one it imports) imports React — which
 * the transitive rule already covers. Listing them here would be a second,
 * name-based heuristic that could disagree with the first.
 */
export function isReactSpecifier(specifier) {
  return (
    specifier === 'react' ||
    specifier.startsWith('react/') ||
    specifier === 'react-dom' ||
    specifier.startsWith('react-dom/')
  );
}

/** Rollup bundle chunks only — assets (CSS) have no imports and no code. */
function chunkEntries(bundle) {
  return Object.entries(bundle).filter(([, item]) => item && item.type === 'chunk');
}

/**
 * The set of chunk file names that need the directive.
 *
 * Fixpoint over "imports React or imports a chunk that needs it". Bundles are
 * small (a dozen chunks) so the repeated pass is cheaper than being clever.
 *
 * @param {Record<string, {type: string, imports?: string[]}>} bundle
 * @returns {Set<string>}
 */
export function chunksNeedingDirective(bundle) {
  const chunks = chunkEntries(bundle);
  const needs = new Set();

  for (const [fileName, item] of chunks) {
    if ((item.imports || []).some(isReactSpecifier)) needs.add(fileName);
  }

  let grew = true;
  while (grew) {
    grew = false;
    for (const [fileName, item] of chunks) {
      if (needs.has(fileName)) continue;
      if ((item.imports || []).some((dep) => needs.has(dep))) {
        needs.add(fileName);
        grew = true;
      }
    }
  }

  return needs;
}

/**
 * Prepend the directive to every chunk that needs it. Mutates `bundle` in
 * place, which is how a Rollup `generateBundle` hook edits output.
 *
 * @returns {string[]} the file names that were marked, in bundle order
 */
export function applyDirectives(bundle) {
  const needs = chunksNeedingDirective(bundle);
  const touched = [];
  for (const [fileName, item] of chunkEntries(bundle)) {
    if (!needs.has(fileName)) continue;
    if (item.code.startsWith(DIRECTIVE)) continue;
    item.code = `${DIRECTIVE}\n${item.code}`;
    touched.push(fileName);
  }
  return touched;
}

/** Every .js file under `dir`, as paths relative to `dir` with `/` separators. */
function jsFiles(dir, base = dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) jsFiles(full, base, acc);
    else if (entry.endsWith('.js')) acc.push(path.relative(base, full).replaceAll('\\', '/'));
  }
  return acc;
}

/** Static import specifiers of an emitted ESM file. */
const IMPORT_SPECIFIER =
  /(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;

function importsOf(code) {
  const out = [];
  for (const m of code.matchAll(IMPORT_SPECIFIER)) out.push(m[1] || m[2]);
  return out;
}

/**
 * Re-derive the rule from a built `dist/` and compare it with what is there.
 *
 * Builds a bundle-shaped map from the files: relative specifiers are resolved
 * to the file they point at so the same transitive rule applies. Returns the
 * chunks that need the directive and lack it (`missing`), the chunks that
 * carry it and should not (`spurious`), and how many files were read.
 *
 * @param {string} dir
 * @returns {{ missing: string[], spurious: string[], scanned: number }}
 */
export function auditDist(dir) {
  const files = jsFiles(dir);
  const bundle = {};
  for (const rel of files) {
    const code = readFileSync(path.join(dir, rel), 'utf8');
    const imports = importsOf(code).map((spec) => {
      if (!spec.startsWith('.')) return spec;
      return path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    });
    bundle[rel] = { type: 'chunk', imports, code };
  }

  const needs = chunksNeedingDirective(bundle);
  const missing = [];
  const spurious = [];
  for (const rel of files) {
    const has = bundle[rel].code.startsWith(DIRECTIVE);
    if (needs.has(rel) && !has) missing.push(rel);
    if (!needs.has(rel) && has) spurious.push(rel);
  }
  return { missing, spurious, scanned: files.length };
}
