#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-codemod-pattern-names.mjs (hds#316)
 *
 * Writes codemods/patterns-subpath.names.json: the component names that
 * `codemods/patterns-subpath.mjs` moves from the package root to
 * `@hirobius/design-system/patterns`. The list is read from the deprecated
 * root aliases in src/index.ts (`export const X = _X254;`, hds#254), never
 * hand-kept; scripts/__tests__/patterns-subpath-codemod.test.mjs fails when
 * the committed JSON drifts from that source.
 *
 * Run: pnpm codemod:names
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Names of the root-only deprecated pattern aliases in the barrel source. */
export function extractRootPatternNames(indexSource) {
  const names = [];
  for (const m of indexSource.matchAll(/^export const ([A-Z]\w*) = _\w+254;/gm)) names.push(m[1]);
  return names.sort();
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NAMES_PATH = join(REPO, 'codemods/patterns-subpath.names.json');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = extractRootPatternNames(readFileSync(join(REPO, 'src/index.ts'), 'utf8'));
  writeFileSync(
    NAMES_PATH,
    JSON.stringify({ subpath: '@hirobius/design-system/patterns', names }, null, 2) + '\n',
  );
  console.log(`codemod:names wrote ${names.length} names to codemods/patterns-subpath.names.json`);
}
