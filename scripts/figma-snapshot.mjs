#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Hirobius Design System — `pnpm figma:snapshot`
 *
 * Figma → repo, read only. On a Professional plan nothing in CI can read Figma
 * variables (the REST variables API is Enterprise-only), so drift detection
 * compares the model against a committed snapshot: figma/snapshot.json.
 *
 * Usage:
 *   pnpm figma:snapshot                  write the carriers (same as pnpm figma:push)
 *                                        and print how to take a snapshot
 *   pnpm figma:snapshot --ingest <file>  verify a snapshot's checksum and write
 *                                        figma/snapshot.json
 *
 * Take the snapshot with the development plugin ("Take snapshot", then
 * Download JSON) or by running figma/push/use-figma/snapshot.js through
 * use_figma and saving what it returns.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseSnapshotFile, serializeSnapshotFile } from './lib/figma-snapshot.mjs';
import { writePushArtifacts } from './figma-push.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Verifies a snapshot file and writes it to <root>/figma/snapshot.json.
 * Writes nothing when verification fails.
 *
 * @param {{ root: string, from: string }} options
 */
export function ingestSnapshot({ root, from }) {
  const verified = parseSnapshotFile(readFileSync(from, 'utf8'));
  const outPath = join(root, 'figma', 'snapshot.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeSnapshotFile(verified));
  return { ...verified, outPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--ingest');
  try {
    if (at === -1) {
      const outDir = join(ROOT, 'figma', 'push');
      writePushArtifacts({ root: ROOT, outDir });
      const rel = relative(ROOT, outDir).replaceAll('\\', '/');
      console.log(
        [
          'figma:snapshot — NO SNAPSHOT TAKEN. This command only prints these instructions.',
          '  Taking the snapshot happens in Figma; only the --ingest step below writes anything here.',
          '',
          `  Development plugin: import ${rel}/plugin/manifest.json once, run "Take snapshot", click Download JSON.`,
          `  use_figma: run ${rel}/use-figma/snapshot.js unmodified and save the returned JSON to a file.`,
          '  Then: pnpm figma:snapshot --ingest <file>   (verifies the checksum, writes figma/snapshot.json)',
          '  Commit figma/snapshot.json, then run pnpm check:figma-drift.',
        ].join('\n'),
      );
    } else {
      const from = args[at + 1];
      if (!from) throw new Error('--ingest needs the path of the snapshot file.');
      const { snapshot, outPath } = ingestSnapshot({ root: ROOT, from: resolve(from) });
      const counts = snapshot.collections.map((c) => `${c.name} ${c.variables.length}`).join(', ');
      console.log(
        `✓ ${relative(ROOT, outPath).replaceAll('\\', '/')} — "${snapshot.file.name}" at ${snapshot.takenAt}: ${counts}; ${snapshot.textStyles.length} text styles, ${snapshot.effectStyles.length} effect styles`,
      );
    }
  } catch (error) {
    console.error(`✗ figma:snapshot — ${error.message}`);
    process.exit(1);
  }
}
