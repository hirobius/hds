#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Compares the Figma model built from hirobius.tokens.json against the committed Figma snapshot (figma/snapshot.json) and reports missing, extra and changed variables, modes and styles.
 *
 * `pnpm check:figma-drift`. The snapshot is Figma as of the last
 * `pnpm figma:snapshot` (Professional and Organization plans cannot read
 * variables from CI). The diff is the push plan (scripts/lib/figma-drift.mjs),
 * so drift and `pnpm figma:push` always agree.
 *
 * Exit codes: 0 no drift · 1 drift, or a snapshot that fails its checksum ·
 * 2 no snapshot taken yet.
 *
 * --ci (the ci.yml step) fails only on drift a push cannot explain: the
 * snapshot says Figma was last pushed from exactly the model the tokens build
 * now (`lastPush.modelHash`), yet Figma differs, so it was edited after that
 * push. Any other drift may be a change nobody has pushed yet (to
 * hirobius.tokens.json, to the model builder, or a file never pushed), which
 * nobody without Figma access can fix, so it is a GitHub warning annotation.
 * The decision uses content, not commit dates, so a branch whose token commit
 * predates a snapshot committed later is not blamed. No snapshot yet is a
 * notice. A snapshot that fails its checksum always fails.
 *
 * Usage:
 *   node scripts/check-figma-drift.mjs [--json] [--ci]
 *
 * Fixture mode (docs/guardrails/FIXTURE_DIR_HARNESS.md): with FIXTURE_DIR set,
 * hirobius.tokens.json, TOKEN_MIGRATION.md and figma/snapshot.json are read
 * from that directory.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadFigmaInputs } from './lib/figma-inputs.mjs';
import { parseSnapshotFile } from './lib/figma-snapshot.mjs';
import { figmaDrift, formatDrift } from './lib/figma-drift.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ root: string, json?: boolean, ci?: boolean }} options
 * @returns {{ exitCode: 0|1|2, output: string, report?: object }}
 */
export function runDriftCheck({ root, json = false, ci = false }) {
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  if (!existsSync(snapshotPath)) {
    const message =
      'No Figma snapshot yet (figma/snapshot.json). Push the tokens (pnpm figma:push), take a snapshot (pnpm figma:snapshot), commit it, then run this again.';
    return ci
      ? { exitCode: 0, output: `::notice title=Figma drift::${message}` }
      : { exitCode: 2, output: message };
  }
  try {
    const { model, renames } = loadFigmaInputs(root);
    const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
    const report = figmaDrift(model, snapshotFile, { renames });
    const output = json ? JSON.stringify(report, null, 2) : formatDrift(report);
    if (report.ok || !ci) return { exitCode: report.ok ? 0 : 1, output, report };
    const count = `${report.items.length} drift item(s)`;
    const unexplained = report.pushedFromOtherModel === false;
    const annotation = unexplained
      ? `::error title=Figma drift::${count} although Figma was last pushed from this exact model: Figma was edited after that push. Push again (pnpm figma:push) and commit a new snapshot.`
      : report.pushedFromOtherModel === null
        ? `::warning title=Figma drift::${count}, and this Figma file was never pushed by pnpm figma:push: push the tokens (pnpm figma:push) and commit a new snapshot.`
        : `::warning title=Figma drift::${count}, and Figma was last pushed from a different model than the tokens build now: the drift may be token or model changes not pushed yet. Push them (pnpm figma:push) and commit a new snapshot.`;
    return { exitCode: unexplained ? 1 : 0, output: `${output}\n${annotation}`, report };
  } catch (error) {
    return { exitCode: 1, output: `✗ check-figma-drift — ${error.message}` };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixtureDir = process.env.FIXTURE_DIR;
  const { exitCode, output } = runDriftCheck({
    root: fixtureDir || ROOT,
    json: process.argv.includes('--json'),
    ci: process.argv.includes('--ci'),
  });
  // GitHub reads ::notice/::warning/::error annotations from stdout.
  (exitCode === 0 || process.argv.includes('--ci') ? console.log : console.error)(output);
  process.exit(exitCode);
}
