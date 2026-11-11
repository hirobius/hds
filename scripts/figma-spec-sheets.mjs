#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/figma-spec-sheets.mjs — spec sheets in the HDS Figma library, from code.
 *
 *   --emit-draw <Name>=<pageId> ...  print the use_figma script that draws each
 *                                    component's sheet on its page (scripts/lib/figma-spec-sheet.mjs)
 *   --model <Name>                   print the sheet model (JSON) for one component
 *   --emit-audit                     print the read-only use_figma audit script
 *   --ingest <result.json>           write figma/spec-sheet-audit.json from that script's result
 *
 * Run the printed scripts through use_figma unmodified (log each call in
 * figma/MCP-LEDGER.md first). scripts/check-figma-spec-coverage.mjs gates the audit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specSheetModel, specSheetScript } from './lib/figma-spec-sheet.mjs';
import { auditScript, normaliseAudit } from './lib/figma-spec-coverage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

export function modelFor(name) {
  const manifest = readJson('public/hds-manifest.json');
  const spec = manifest.componentSpecs?.[name];
  const source = spec?.filePath ? readFileSync(path.join(ROOT, spec.filePath), 'utf8') : '';
  return specSheetModel(name, {
    manifest,
    tokens: readJson('hirobius.tokens.json'),
    source,
    deprecations: readJson('deprecations.json'),
  });
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === '--emit-draw') {
    const entries = rest.map((a) => {
      const [name, pageId] = a.split('=');
      return { pageId, model: modelFor(name) };
    });
    process.stdout.write(specSheetScript(entries));
  } else if (cmd === '--model') {
    console.log(JSON.stringify(modelFor(rest[0]), null, 2));
  } else if (cmd === '--emit-audit') {
    process.stdout.write(auditScript());
  } else if (cmd === '--ingest') {
    const raw = JSON.parse(readFileSync(path.resolve(rest[0]), 'utf8'));
    const audit = normaliseAudit(raw, new Date().toISOString().slice(0, 10));
    writeFileSync(
      path.join(ROOT, 'figma/spec-sheet-audit.json'),
      JSON.stringify(audit, null, 2) + '\n',
    );
    console.log(
      `spec-sheet audit: ${audit.pages.length} pages written to figma/spec-sheet-audit.json`,
    );
  } else {
    console.error(
      'usage: figma-spec-sheets.mjs --emit-draw <Name>=<pageId>... | --model <Name> | --emit-audit | --ingest <file>',
    );
    process.exit(2);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
