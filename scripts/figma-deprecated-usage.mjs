#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * `pnpm figma:deprecated-usage` (hds#483): the read-only audit of the HDS
 * library for layers that use a deprecated text style or variable.
 *
 *   (no flag)        write figma/reads/deprecated-usage.js from the tokens'
 *                    $deprecated data and the committed figma/snapshot.json ids
 *   --check          fail when that file is not what the inputs build now
 *   --ingest <file>  verify a saved use_figma result and write
 *                    figma/deprecated-usage.json, which
 *                    scripts/check-figma-deprecated-usage.mjs reads
 *
 * Never talks to Figma. Runbook: figma/README.md, "Deprecated styles".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  deprecatedTextStyles,
  deprecatedUsageScript,
  deprecatedUsageTargets,
} from './lib/figma-deprecated-styles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SCRIPT_PATH = join('figma', 'reads', 'deprecated-usage.js');
export const RECORD_PATH = join('figma', 'deprecated-usage.json');

const readJson = (root, p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

/** The read script the inputs build now. */
export function buildAuditScript(root) {
  const tree = readJson(root, 'hirobius.tokens.json');
  const { snapshot } = readJson(root, join('figma', 'snapshot.json'));
  return deprecatedUsageScript(deprecatedUsageTargets(tree, snapshot));
}

/** Validates a use_figma result and returns the record to commit. */
export function recordFromResult(root, result) {
  const library = readJson(root, join('figma', 'links.json')).libraryFileKey;
  const want = deprecatedTextStyles(readJson(root, 'hirobius.tokens.json'))
    .map((d) => d.style)
    .sort();
  if (result.fileKey && result.fileKey !== library)
    throw new Error(`the result is from ${result.fileKey}, not the library ${library}.`);
  if (JSON.stringify([...(result.styles ?? [])].sort()) !== JSON.stringify(want))
    throw new Error(
      `the result audited styles ${JSON.stringify(result.styles)}, but code deprecates ${JSON.stringify(want)}: regenerate the script (pnpm figma:deprecated-usage) and run it again.`,
    );
  if (!Array.isArray(result.hits)) throw new Error('the result has no hits array.');
  return {
    $comment:
      'Written by pnpm figma:deprecated-usage --ingest from figma/reads/deprecated-usage.js run on the library. Read by scripts/check-figma-deprecated-usage.mjs. Do not edit.',
    takenAt: result.takenAt,
    fileKey: library,
    styles: want,
    variables: result.variables,
    pages: result.pages,
    hits: result.hits,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === '--ingest') {
      if (!args[1]) throw new Error('usage: --ingest <use_figma result json>');
      let result = JSON.parse(readFileSync(args[1], 'utf8'));
      if (typeof result === 'string') result = JSON.parse(result);
      const record = recordFromResult(ROOT, result);
      writeFileSync(join(ROOT, RECORD_PATH), `${JSON.stringify(record, null, 2)}\n`);
      console.log(`✓ figma:deprecated-usage — wrote ${RECORD_PATH}: ${record.hits.length} hit(s).`);
    } else {
      const code = buildAuditScript(ROOT);
      const path = join(ROOT, SCRIPT_PATH);
      if (args.includes('--check')) {
        if (!existsSync(path) || readFileSync(path, 'utf8') !== code) {
          console.error(
            `✗ figma:deprecated-usage --check — ${SCRIPT_PATH} is stale; run pnpm figma:deprecated-usage.`,
          );
          process.exit(1);
        }
        console.log(`✓ figma:deprecated-usage --check — ${SCRIPT_PATH} is fresh.`);
      } else {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, code);
        console.log(
          `✓ wrote ${SCRIPT_PATH} (${code.length} chars). Next: log the call in figma/MCP-LEDGER.md, run it unmodified with use_figma on the library, save the result, then pnpm figma:deprecated-usage --ingest <file>.`,
        );
      }
    }
  } catch (error) {
    console.error(`✗ figma:deprecated-usage — ${error.message}`);
    process.exit(1);
  }
}
