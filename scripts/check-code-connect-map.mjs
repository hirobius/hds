#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-code-connect-map.mjs — every library component in the HDS Figma library
 * has a Code Connect mapping in code: a Figma node, a source file that exists,
 * and an import entry (src/index.ts or src/patterns.ts re-exports the module).
 * Also fails when figma/code-connect-map.json is not what the generator writes.
 *
 * A component counts when figma/disposition.json classes it `library` and the
 * manifest does not mark it deprecated. Fix a missing node with an `@figma`
 * JSDoc tag (or a figma/mapping-overrides.json entry for a tagless part), then
 * `node scripts/figma-code-connect-map.mjs --write`.
 *
 * Exit 0 mapped · 1 a component has no mapping, or the map is stale.
 * FIXTURE_DIR=<root> reads from a fixture root instead.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMap, MAP_PATH, serialise } from './figma-code-connect-map.mjs';

const BASE = process.env.FIXTURE_DIR
  ? path.resolve(process.env.FIXTURE_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { map, file } = buildMap();
if (process.argv.includes('--json')) console.log(JSON.stringify(map, null, 2));
let failed = false;
for (const m of map.missing) {
  failed = true;
  console.error(`  error code-connect-unmapped: ${m.name}: ${m.why.join('; ')}.`);
}
const committedPath = path.join(BASE, MAP_PATH);
const committed = existsSync(committedPath) ? readFileSync(committedPath, 'utf8') : '';
if (committed !== serialise(file)) {
  failed = true;
  console.error(
    `  error code-connect-map-stale: ${MAP_PATH} differs from the generator. Run node scripts/figma-code-connect-map.mjs --write.`,
  );
}
if (failed) process.exit(1);
console.log(
  `✓ check-code-connect-map — ${map.entries.length} library components mapped to code (${map.exempt.length} deprecated exempt).`,
);
