#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-code-connect-map.mjs — every library component in the HDS Figma library
 * has a Code Connect mapping in code: a Figma node, a source file that exists,
 * and an import entry (src/index.ts or src/patterns.ts re-exports the module).
 * Freshness of figma/code-connect-map.json is the generator's own `--check`
 * (pretest runs both).
 *
 * A component counts when figma/disposition.json classes it `library` and the
 * manifest does not mark it deprecated. Fix a missing node with an `@figma`
 * JSDoc tag (or a figma/mapping-overrides.json entry for a tagless part), then
 * `node scripts/figma-code-connect-map.mjs`.
 *
 * Exit 0 mapped · 1 a component has no mapping.
 * FIXTURE_DIR=<root> reads from a fixture root instead.
 */
import { buildMap } from './figma-code-connect-map.mjs';

const { map } = buildMap();
if (process.argv.includes('--json')) console.log(JSON.stringify(map, null, 2));
let failed = false;
for (const m of map.missing) {
  failed = true;
  console.error(`  error code-connect-unmapped: ${m.name}: ${m.why.join('; ')}.`);
}
if (failed) process.exit(1);
console.log(
  `✓ check-code-connect-map — ${map.entries.length} library components mapped to code (${map.exempt.length} deprecated exempt).`,
);
