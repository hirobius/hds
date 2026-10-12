#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Fails when the committed Figma snapshot records a paint or effect bound to a colour variable whose raw fallback colour differs from the variable's value.
 *
 * `pnpm check:figma-fallbacks`. Figma stores a raw "fallback" colour beside
 * every colour binding and renders it where the binding cannot resolve (a
 * consumer file before the library is published). A binding over the wrong raw
 * colour looks right in the library and wrong everywhere else: the Kbd drop
 * shadow was bound to color/border/strong over pure black, so Figma showed a
 * black edge where code shows light grey (hds, 2026-10-12; a sweep found 21).
 *
 * The record is `bindingFallbacks` in figma/snapshot.json, taken by
 * figma/push/use-figma/fallbacks.js (scripts/lib/figma-fallbacks.mjs) and
 * ingested with `pnpm figma:snapshot --fallbacks <file>`. Like the drift check
 * this reads the committed record, because CI cannot read Figma (Professional
 * plan). The fix for a finding is in Figma: set the raw colour to the
 * variable's value and keep the binding, then take the sweep again.
 *
 * Exit codes: 0 no mismatch recorded, or no sweep recorded yet (a notice: a
 * snapshot that predates the key is not a failure) · 1 a mismatch is recorded,
 * or the snapshot or its record fails its checksum.
 *
 * Usage:
 *   node scripts/check-figma-fallbacks.mjs [--json]
 *
 * Fixture mode (docs/guardrails/FIXTURE_DIR_HARNESS.md): with FIXTURE_DIR set,
 * figma/snapshot.json is read from that directory.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseSnapshotFile } from './lib/figma-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The finding for one mismatch, with the fix. */
export function formatMismatch(item) {
  return [
    `  ✗ ${item.nodeName} (${item.nodeId}) on page "${item.page}": ${item.kind} bound to ${item.variable} stores raw ${item.raw}, the variable is ${item.expected}`,
    `    fix: in Figma, set that ${item.kind}'s raw colour to ${item.expected} (the variable's value) and keep the binding.`,
  ].join('\n');
}

/**
 * @param {{ root: string, json?: boolean }} options
 * @returns {{ exitCode: 0|1, output: string, record?: object }}
 */
export function runFallbackCheck({ root, json = false }) {
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  if (!existsSync(snapshotPath)) {
    return {
      exitCode: 0,
      output:
        '⚠ check-figma-fallbacks: no Figma snapshot yet (figma/snapshot.json), so no bound-colour sweep is recorded. Take a snapshot (pnpm figma:snapshot), then the sweep (pnpm figma:push, run figma/push/use-figma/fallbacks.js, pnpm figma:snapshot --fallbacks <file>).',
    };
  }
  let file;
  try {
    file = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
  } catch (error) {
    return { exitCode: 1, output: `✗ check-figma-fallbacks — ${error.message}` };
  }
  const record = file.bindingFallbacks;
  if (!record) {
    return {
      exitCode: 0,
      output:
        '⚠ check-figma-fallbacks: not recorded. figma/snapshot.json predates the bound-colour sweep, so nothing is checked. Record it: pnpm figma:push, run figma/push/use-figma/fallbacks.js through use_figma in the library, save the result, then pnpm figma:snapshot --fallbacks <file> (figma/README.md "Bound-colour fallbacks").',
    };
  }
  const found = record.mismatches;
  if (json) {
    return { exitCode: found.length ? 1 : 0, output: JSON.stringify(record, null, 2), record };
  }
  const scope = record.scope === 'all' ? `${record.pages} pages` : 'components only';
  if (!found.length) {
    return {
      exitCode: 0,
      output: `✓ check-figma-fallbacks: ${record.bindings} colour bindings on ${record.nodes} nodes (${scope}) have the variable's value as their raw colour (sweep taken ${record.takenAt})`,
      record,
    };
  }
  return {
    exitCode: 1,
    output: [
      `✗ check-figma-fallbacks: ${found.length} colour binding(s) store a raw fallback colour that is not the variable's value (sweep taken ${record.takenAt}, ${scope}).`,
      'Figma renders the raw colour where the binding cannot resolve (a consumer file before the library is published), so each looks right in the library and wrong elsewhere.',
      ...found.map(formatMismatch),
      'Then run figma/push/use-figma/fallbacks.js again and record it: pnpm figma:snapshot --fallbacks <file>.',
    ].join('\n'),
    record,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, output } = runFallbackCheck({
    root: process.env.FIXTURE_DIR || ROOT,
    json: process.argv.includes('--json'),
  });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}
