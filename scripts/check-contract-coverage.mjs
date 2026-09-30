#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-contract-coverage — every core component says when to use it.
 *
 * Agents pick components from the public docs, and nothing machine-readable
 * told them when to reach for one over its neighbour (hds#339). The contract
 * tags (@usage, @whenNot, @useInstead) land in `usage` on each manifest spec;
 * this reports which core components (scripts/lib/core-components.mjs) still
 * lack a `usage.when` of at least MIN_WHEN_LENGTH characters.
 *
 *   node scripts/check-contract-coverage.mjs             # same as --report
 *   node scripts/check-contract-coverage.mjs --report    # lists misses, exits 0
 *   node scripts/check-contract-coverage.mjs --enforce   # exits 1 on any miss
 *
 * Report-only for now (firingChannel: manual). hds#340 authors the remaining
 * tags and moves this to a pre-commit gate with --enforce.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CORE_COMPONENTS } from './lib/core-components.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'public/hds-manifest.json');

export const MIN_WHEN_LENGTH = 20;

/**
 * Names in `names` whose spec has no usage.when of MIN_WHEN_LENGTH+ characters.
 *
 * @param {string[]} names
 * @param {Record<string, { usage?: { when?: string } }>} specs componentSpecs
 * @returns {string[]}
 */
export function findContractGaps(names, specs) {
  return names.filter((name) => (specs[name]?.usage?.when ?? '').length < MIN_WHEN_LENGTH);
}

function main() {
  const enforce = process.argv.includes('--enforce');

  if (!existsSync(MANIFEST)) {
    console.error('✗ check-contract-coverage — public/hds-manifest.json is missing');
    console.error('  fix: pnpm manifest:generate');
    process.exit(1);
  }

  const specs = JSON.parse(readFileSync(MANIFEST, 'utf8')).componentSpecs ?? {};
  const gaps = findContractGaps(CORE_COMPONENTS, specs);
  const covered = CORE_COMPONENTS.length - gaps.length;

  console.log(
    `\ncheck-contract-coverage — ${covered}/${CORE_COMPONENTS.length} core components have usage.when`,
  );

  if (gaps.length === 0) return;

  const out = enforce ? console.error : console.log;
  out(
    `\n${enforce ? '✗' : '·'} ${gaps.length} core component(s) lack usage.when (${MIN_WHEN_LENGTH}+ chars):\n`,
  );
  for (const name of gaps) out(`    ${name}  ${specs[name]?.filePath ?? '(no spec)'}`);
  out(
    '\n  fix: add @usage / @whenNot / @useInstead to the component JSDoc, then\n' +
      '  pnpm manifest:generate. Tag contract: docs/rules/REACT_COMPONENTS.md.',
  );

  if (enforce) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
