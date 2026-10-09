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
 *                                        the library from receipt.js's results, verify
 *                                        it, then ingest it the same way (hds#417)
 *  pnpm figma:snapshot --from-diff <file>
 *                                        re-base figma/snapshot.json after the library
 *                                        changed outside the repo: rebuild the live
 *                                        snapshot from the committed one plus what
 *                                        use_figma returned for snapshot-diff.js,
 *                                        verify its checksum, then ingest it the same way
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
import { rebuildFromDiff } from './lib/figma-diff-rebuild.mjs';
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
 * Rebuilds the snapshot a Sync wrote into the library from receipt.js's saved
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

/**
 * Rebuilds the live snapshot from the committed figma/snapshot.json plus the
 * saved result of snapshot-diff.js (scripts/lib/figma-diff-rebuild.mjs checks
 * file, base, and the live checksum), then ingests it exactly as --ingest
 * does. Writes nothing when any check fails.
 *
 * @param {{ root: string, from: string }} options
 */
export function ingestDiff({ root, from }) {
  let diff;
  try {
    diff = JSON.parse(readFileSync(from, 'utf8'));
  } catch {
    throw new Error(
      `${from} is not JSON: save what use_figma returned for snapshot-diff.js, unedited, then run this again.`,
    );
  }
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  if (!existsSync(snapshotPath)) {
    throw new Error(
      'There is no committed figma/snapshot.json to re-base. Take a full snapshot (pnpm figma:snapshot) and ingest it instead.',
    );
  }
  const base = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
  const { libraryFileKey } = syncConfigFromLinks(readLinks(root));
  const rebuilt = rebuildFromDiff({ diff, base, libraryFileKey });
  return { ...ingestSnapshot({ root, text: serializeSnapshotFile(rebuilt) }), diff };
}

/**
 * What `pnpm figma:snapshot` prints with no arguments: after a Sync, the agent
 * collects the snapshot from the receipt (figma/README.md "Agent: collect a
 * sync"); Download JSON and the other carriers are the fallback.
 *
 * @param {string} rel  the carriers' folder, relative to the repo root (figma/push)
 * @returns {string[]} lines
 */
export function snapshotSteps(rel) {
  return [
    'figma:snapshot — take a snapshot of the Figma file, then ingest it:',
    '  After a Sync (figma/README.md "Agent: collect a sync"): run',
    `    ${rel}/use-figma/receipt.js through use_figma once per page and save each result,`,
    '    then pnpm figma:snapshot --from-receipt <files...>. No download.',
    '  Fallback, when there is no receipt to collect:',
    `    Sync plugin (${rel}/plugin): run Sync, then click Download JSON.`,
    `    Promote plugin: import ${rel}/promote/manifest.json, run "Take snapshot", click Download JSON.`,
    `    use_figma: run ${rel}/use-figma/snapshot.js unmodified and save the returned JSON to a file.`,
    '    Then: pnpm figma:snapshot --ingest <file>   (verifies the checksum, writes figma/snapshot.json)',
    `    The library changed outside the repo: ${rel}/use-figma/snapshot-diff.js (one use_figma call, a few KB back),`,
    '    then pnpm figma:snapshot --from-diff <file> (figma/README.md "re-base after an out-of-band change").',
    '  Commit figma/snapshot.json only when pnpm check:figma-drift exits 0 AND pnpm figma:push --plan',
    '  prints "updated 0 · created 0 · deleted 0".',
  ];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--ingest');
  const fromReceipt = args.indexOf('--from-receipt');
  const fromDiff = args.indexOf('--from-diff');
  try {
    if (fromDiff !== -1) {
      const file = args[fromDiff + 1];
      if (!file || file.startsWith('--')) {
        throw new Error(
          '--from-diff needs the file saved from figma/push/use-figma/snapshot-diff.js.',
        );
      }
      const { snapshot, outPath, checksum, diff } = ingestDiff({ root: ROOT, from: resolve(file) });
      console.log(
        [
          `✓ ${relative(ROOT, outPath).replaceAll('\\', '/')} re-based from snapshot-diff (live ${checksum}; ${diff.changed.collections.length + diff.changed.variables.length + diff.changed.textStyles.length + diff.changed.effectStyles.length} changed, ${diff.removed.length} removed record(s)) at ${snapshot.takenAt}`,
          '  Commit it, then pnpm figma:push --delta for any change the model still has to make.',
        ].join('\n'),
      );
    } else if (fromReceipt !== -1) {
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
      console.log(snapshotSteps(relative(ROOT, outDir).replaceAll('\\', '/')).join('\n'));
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
