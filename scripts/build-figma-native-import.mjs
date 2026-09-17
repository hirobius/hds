#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — `pnpm figma:native-import`
 *
 * The fallback when no plugin or MCP write can run: DTCG files for Figma's own
 * Variables ▸ Import, one per collection × mode, written to figma/native-import/
 * (generated, gitignored). Variables only: no codeSyntax, text styles or effect
 * styles (the importer has no field for them) — `pnpm figma:push` is the
 * complete path. See figma/README.md for the import steps.
 */

import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { loadFigmaInputs } from './lib/figma-inputs.mjs';
import { buildNativeImportFiles } from './lib/figma-native-import.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ root: string, outDir: string }} options
 * @returns {{ files: Array<{ path: string, collection: string, mode: string, tokens: object }> }}
 */
export function writeNativeImport({ root, outDir }) {
  const { model } = loadFigmaInputs(root);
  const files = buildNativeImportFiles(model);
  rmSync(outDir, { recursive: true, force: true });
  for (const file of files) {
    const target = join(outDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(file.tokens, null, 2)}\n`);
  }
  return { files };
}

/**
 * The import steps, in order, then every alias the import cannot keep.
 *
 * @param {Array<{ path: string, collection: string, mode: string, forwardAliases: object[] }>} files
 * @param {string} rel  The output directory, relative to the repo root.
 */
export function formatNativeImportSteps(files, rel) {
  const lines = [`figma:native-import — ${files.length} files in ${rel}/, import in this order:`];
  let current = null;
  for (const file of files) {
    if (file.collection !== current) {
      current = file.collection;
      lines.push(`  ${current}: create the collection, then import each file as a mode`);
    }
    lines.push(`    ${rel}/${file.path}  → mode "${file.mode}"`);
  }
  const forward = files.flatMap((file) => file.forwardAliases.map((alias) => ({ file, alias })));
  if (forward.length > 0) {
    lines.push('  Aliases the import cannot keep (their target collection comes later):');
    for (const { file, alias } of forward) {
      lines.push(
        `    ${rel}/${file.path}: ${alias.variable} aliases ${alias.target} ${alias.targetVariable}, which is imported later, so it imports as a raw value. Run pnpm figma:push afterwards to restore the alias.`,
      );
    }
  }
  lines.push('  Details and what to check afterwards: figma/README.md');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = join(ROOT, 'figma', 'native-import');
  try {
    const { files } = writeNativeImport({ root: ROOT, outDir });
    console.log(formatNativeImportSteps(files, relative(ROOT, outDir).replaceAll('\\', '/')));
  } catch (error) {
    console.error(`✗ figma:native-import — ${error.message}`);
    process.exit(1);
  }
}
