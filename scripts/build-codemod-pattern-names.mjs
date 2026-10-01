#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-codemod-pattern-names.mjs (hds#316, hds#389 R1)
 *
 * Writes codemods/patterns-subpath.names.json: every name that
 * `codemods/patterns-subpath.mjs` moves from the package root to
 * `@hirobius/design-system/patterns`. That is whatever `/patterns` exports and
 * the root does not: since 0.20.0 the root no longer re-exports the 21
 * pattern modules (hds#254), so the list holds each component plus its props
 * types, parts, hooks and `*Variants`, and the rewrite is a pure path change.
 *
 * Both surfaces come from the same walk `pnpm api:check` uses
 * (scripts/lib/check-public-api.mjs), never a hand-kept list;
 * scripts/__tests__/patterns-subpath-codemod.test.mjs fails when the committed
 * JSON drifts from it.
 *
 * Run: pnpm codemod:names
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPublicApi } from './lib/check-public-api.mjs';

/**
 * Names `/patterns` exports that no root module exports, sorted.
 * @param {{ modules: Record<string, string[]> }} surface collectPublicApi() output
 */
export function derivePatternNames(surface) {
  const root = new Set(
    Object.entries(surface.modules)
      .filter(([key]) => !key.startsWith('@subpath/'))
      .flatMap(([, names]) => names),
  );
  return (surface.modules['@subpath/patterns'] ?? [])
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default' && !root.has(name))
    .sort();
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NAMES_PATH = join(REPO, 'codemods/patterns-subpath.names.json');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = derivePatternNames(collectPublicApi(REPO));
  writeFileSync(
    NAMES_PATH,
    JSON.stringify({ subpath: '@hirobius/design-system/patterns', names }, null, 2) + '\n',
  );
  console.log(`codemod:names wrote ${names.length} names to codemods/patterns-subpath.names.json`);
}
