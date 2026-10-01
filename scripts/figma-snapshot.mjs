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
 *   pnpm figma:snapshot --from-receipt <files...>
 *                                        rebuild the snapshot a Sync wrote into
 *                                        staging from receipt.js's results, verify
 *                                        it, then ingest it the same way (hds#417)
 *
 * After a Sync, an agent collects the snapshot with figma/push/use-figma/receipt.js
 * (figma/README.md "Agent: collect a sync"). Otherwise take it with the Sync
 * plugin (Sync, then Download JSON), with the promote plugin ("Take snapshot",
 * then Download JSON), or by running figma/push/use-figma/snapshot.js through
 * use_figma and saving what it returns.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parseSnapshotFile, serializeSnapshotFile } from './lib/figma-snapshot.mjs';
import { rebuildFromReceipt } from './lib/figma-receipt.mjs';
import { syncConfigFromLinks } from './lib/figma-scripts.mjs';
import { readLinks, writePushArtifacts } from './figma-push.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Verifies a snapshot file and writes it to <root>/figma/snapshot.json.
 * Writes nothing when verification fails.
 *
 * @param {{ root: string, from?: string, text?: string }} options  the file, or its text
 */
export function ingestSnapshot({ root, from, text = readFileSync(from, 'utf8') }) {
  const verified = parseSnapshotFile(text);
  const outPath = join(root, 'figma', 'snapshot.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serializeSnapshotFile(verified));
  return { ...verified, outPath };
}

/**
 * Rebuilds the snapshot a Sync wrote into staging from receipt.js's saved
 * results (scripts/lib/figma-receipt.mjs checks file, base, pages, post
 * checksum and freshness), then ingests it exactly as --ingest does. Writes
 * nothing when any check fails.
 *
 * @param {{ root: string, files: string[] }} options
 */
export function ingestReceipt({ root, files }) {
  const reads = files.map((path) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      throw new Error(
        `${path} is not JSON: save what use_figma returned for receipt.js, unedited, then run this again.`,
      );
    }
  });
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  const base = existsSync(snapshotPath)
    ? parseSnapshotFile(readFileSync(snapshotPath, 'utf8'))
    : null;
  const sync = syncConfigFromLinks(readLinks(root));
  const { checksum, snapshot, head } = rebuildFromReceipt({ reads, base, sync });
  return { ...ingestSnapshot({ root, text: serializeSnapshotFile({ checksum, snapshot }) }), head };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--ingest');
  const fromReceipt = args.indexOf('--from-receipt');
  try {
    if (fromReceipt !== -1) {
      const files = args.slice(fromReceipt + 1).filter((arg) => !arg.startsWith('--'));
      if (!files.length) {
        throw new Error(
          '--from-receipt needs the files saved from figma/push/use-figma/receipt.js (one per page).',
        );
      }
      const { snapshot, outPath, head, checksum } = ingestReceipt({
        root: ROOT,
        files: files.map((file) => resolve(file)),
      });
      const counts = snapshot.collections.map((c) => `${c.name} ${c.variables.length}`).join(', ');
      console.log(
        [
          `✓ ${relative(ROOT, outPath).replaceAll('\\', '/')} rebuilt from the receipt of Sync ${head.commit.slice(0, 7)} (post ${checksum}, ${head.pages} ${head.format} page(s), ${head.base ? `delta on ${head.base}` : 'full snapshot'}): ${counts}; ${snapshot.textStyles.length} text styles, ${snapshot.effectStyles.length} effect styles`,
          '  Commit it only when pnpm check:figma-drift exits 0 AND pnpm figma:push --plan prints "updated 0 · created 0 · deleted 0".',
          '  Otherwise: git checkout figma/snapshot.json, report the drift, and stop.',
        ].join('\n'),
      );
    } else if (at === -1) {
      const outDir = join(ROOT, 'figma', 'push');
      writePushArtifacts({ root: ROOT, outDir });
      const rel = relative(ROOT, outDir).replaceAll('\\', '/');
      console.log(
        [
          'figma:snapshot — take a snapshot of the Figma file, then ingest it:',
          `  Sync plugin (${rel}/plugin): run Sync, then click Download JSON.`,
          `  Promote plugin: import ${rel}/promote/manifest.json, run "Take snapshot", click Download JSON.`,
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
