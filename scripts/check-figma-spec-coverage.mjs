#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-figma-spec-coverage.mjs — every library component has a spec sheet in
 * the HDS Figma library.
 *
 * Reads the committed read-only audit figma/spec-sheet-audit.json (refresh:
 * `node scripts/figma-spec-sheets.mjs --emit-audit`, run it through use_figma
 * unmodified, then `--ingest <result.json>`). A component counts when
 * figma/disposition.json classes it `library` and the manifest does not mark
 * it deprecated; it is covered by a frame "<Name> — spec sheet", or by a sheet
 * on the page that holds its @figma node (parts such as TabsTrigger). Draw a
 * missing sheet with `node scripts/figma-spec-sheets.mjs --emit-draw <Name>=<pageId>`.
 *
 * Exit 0 covered · 1 a component has no sheet · 2 no audit committed.
 * FIXTURE_DIR=<root> reads the three files from a fixture root instead.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specCoverage } from './lib/figma-spec-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : ROOT;
const AUDIT = path.join(BASE, 'figma/spec-sheet-audit.json');
const read = (rel) => JSON.parse(readFileSync(path.join(BASE, rel), 'utf8'));

if (!existsSync(AUDIT)) {
  console.error(
    '⚠ check-figma-spec-coverage — figma/spec-sheet-audit.json does not exist. Create it with node scripts/figma-spec-sheets.mjs --emit-audit, then --ingest.',
  );
  process.exit(2);
}

const result = specCoverage(
  read('figma/spec-sheet-audit.json'),
  read('public/hds-manifest.json'),
  read('figma/disposition.json'),
  existsSync(path.join(BASE, 'figma/mapping-overrides.json'))
    ? read('figma/mapping-overrides.json')
    : {},
);
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
for (const m of result.missing) {
  console.error(
    `  error missing-spec-sheet: ${m.name} has no spec sheet in the Figma library` +
      (m.page
        ? ` (its node ${m.nodeId} is on the ${m.page} page)`
        : m.nodeId
          ? ` (node ${m.nodeId} not in the audit)`
          : ' (no @figma node)') +
      `. Draw it: node scripts/figma-spec-sheets.mjs --emit-draw ${m.name}=<pageId>, run it through use_figma, then refresh the audit.`,
  );
}
if (result.missing.length) process.exit(1);
console.log(
  `✓ check-figma-spec-coverage — ${result.covered.length} library components have a spec sheet (${result.exempt.length} deprecated exempt).`,
);
