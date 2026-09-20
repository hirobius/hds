#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-figma-coverage.mjs — every component published to the Figma library
 * must be reachable from code through an `@figma` JSDoc tag.
 *
 * The gap this closes: `figma:links --check` counts components in *code* that
 * carry a tag, so a design published in Figma and never wired up is invisible
 * to it — the count goes up when code shrinks. This counts from the *Figma*
 * side instead, which is the direction that matters for an agent trying to
 * traverse the system: an asset it can see in the library but cannot resolve to
 * a component is a dead end.
 *
 * Runs offline against the committed `figma/inventory.json`. Refresh that with
 * `FIGMA_ACCESS_TOKEN=<token> pnpm figma:inventory --fetch`.
 *
 * Exit codes: 0 clean · 1 unmapped assets (or an incomplete inventory) ·
 * 2 no inventory committed yet.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverage } from './lib/figma-inventory.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY = path.join(ROOT, 'figma/inventory.json');
const MANIFEST = path.join(ROOT, 'public/hds-manifest.json');
const OVERRIDES = path.join(ROOT, 'figma/mapping-overrides.json');

const asJson = process.argv.includes('--json');

if (!existsSync(INVENTORY)) {
  console.error(
    '⚠ check-figma-coverage — figma/inventory.json does not exist, so Figma coverage is unmeasured.\n' +
      '  Create it: FIGMA_ACCESS_TOKEN=<token> pnpm figma:inventory --fetch',
  );
  process.exit(2);
}

const inventory = JSON.parse(readFileSync(INVENTORY, 'utf8'));
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {};
const result = coverage(inventory, manifest, overrides);

// Printed, never silent: an override is a modelling mismatch someone accepted,
// so it should stay visible rather than quietly inflating the mapped count.
for (const o of result.overridden) {
  console.log(`  override  ${o.id.padEnd(10)} ${o.name} → ${o.mapsTo}`);
}

if (asJson) {
  console.log(JSON.stringify({ ...result, complete: inventory.complete !== false }, null, 2));
}

for (const gap of result.unmapped) {
  console.error(
    `  error unmapped-figma-asset: "${gap.name}" (${gap.id}) is published on the ${gap.page} page but no component carries an @figma tag for it. ` +
      `Add \`@figma https://www.figma.com/design/${inventory.fileKey}/HDS-Tokens-Components?node-id=${gap.id.replace(':', '-')}\` ` +
      'to the component JSDoc, then run pnpm manifest:generate && pnpm figma:connect:generate',
  );
}

// An inventory built by hand cannot prove the absence of an asset, so it must
// never read as full coverage. Treating "nothing unmapped" as green here would
// certify exactly the gap the gate exists to find.
if (inventory.complete === false) {
  console.error(
    `  error incomplete-inventory: figma/inventory.json is not a full read of the document ` +
      `(${inventory.incompleteReason ?? 'no reason recorded'}). Coverage below is a floor, not a measurement. ` +
      'Refresh it: FIGMA_ACCESS_TOKEN=<token> pnpm figma:inventory --fetch',
  );
}

const problems = result.unmapped.length + (inventory.complete === false ? 1 : 0);

if (problems === 0) {
  console.log(
    `✓ check-figma-coverage — ${result.mapped} of ${result.total} Figma asset(s) mapped in code`,
  );
  process.exit(0);
}

console.error(
  `✗ check-figma-coverage — ${problems} problem(s); ${result.mapped} of ${result.total} Figma asset(s) mapped`,
);
process.exit(1);
