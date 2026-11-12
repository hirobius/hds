#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/figma-code-connect-map.mjs — the Code Connect map of the HDS Figma
 * library, from code (scripts/lib/figma-code-connect-map.mjs).
 *
 *   --write           write figma/code-connect-map.json
 *   --check           exit 1 when the committed file differs from the generator
 *   --emit-mappings   print the `mappings` JSON for the Figma MCP tool
 *                     send_code_connect_mappings (Organization plan, ADR-019 §3)
 *
 * FIXTURE_DIR=<root> reads (and --write writes) under a fixture root instead.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeConnectMap, mapFile, mappingsPayload } from './lib/figma-code-connect-map.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : ROOT;
export const MAP_PATH = 'figma/code-connect-map.json';
const read = (rel) => JSON.parse(readFileSync(path.join(BASE, rel), 'utf8'));
const text = (rel) =>
  existsSync(path.join(BASE, rel)) ? readFileSync(path.join(BASE, rel), 'utf8') : '';

export function buildMap() {
  const links = read('figma/links.json');
  const map = codeConnectMap({
    manifest: read('public/hds-manifest.json'),
    disposition: read('figma/disposition.json'),
    overrides: existsSync(path.join(BASE, 'figma/mapping-overrides.json'))
      ? read('figma/mapping-overrides.json')
      : {},
    links,
    barrels: { root: text('src/index.ts'), patterns: text('src/patterns.ts') },
    exists: (rel) => existsSync(path.join(BASE, rel)),
  });
  return { map, file: mapFile(map, links.libraryFileKey ?? null) };
}

export const serialise = (file) => JSON.stringify(file, null, 2) + '\n';

function main(argv) {
  const { map, file } = buildMap();
  if (argv.includes('--emit-mappings')) {
    process.stdout.write(JSON.stringify(mappingsPayload(file), null, 2) + '\n');
    return;
  }
  if (argv.includes('--write')) {
    writeFileSync(path.join(BASE, MAP_PATH), serialise(file));
    console.log(
      `code-connect map: ${map.entries.length} components written to ${MAP_PATH} (${map.missing.length} missing, ${map.exempt.length} exempt)`,
    );
    return;
  }
  if (argv.includes('--check')) {
    const committed = text(MAP_PATH);
    if (committed !== serialise(file)) {
      console.error(`✗ ${MAP_PATH} is stale: run node scripts/figma-code-connect-map.mjs --write`);
      process.exit(1);
    }
    console.log(`✓ ${MAP_PATH} is fresh`);
    return;
  }
  console.error('usage: figma-code-connect-map.mjs --write | --check | --emit-mappings');
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
