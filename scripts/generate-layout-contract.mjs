#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Regenerates docs/guardrails/layout-contract.json from the manifest component
 * list plus the hand-set tables in scripts/lib/layout-contract.mjs. Edit the
 * tables, never the JSON. `--check` exits 1 when the file is stale.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContract, validateContract } from './lib/layout-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'docs/guardrails/layout-contract.json');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public/hds-manifest.json'), 'utf8'));
const next = JSON.stringify(buildContract(manifest.componentInventory), null, 2) + '\n';
const problems = validateContract(JSON.parse(next));
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(2);
}
if (process.argv.includes('--check')) {
  let cur = '';
  try {
    cur = readFileSync(out, 'utf8');
  } catch {}
  if (cur !== next) {
    console.error(
      'docs/guardrails/layout-contract.json is stale. Run: node scripts/generate-layout-contract.mjs',
    );
    process.exit(1);
  }
} else {
  writeFileSync(out, next);
  console.log('wrote docs/guardrails/layout-contract.json');
}
