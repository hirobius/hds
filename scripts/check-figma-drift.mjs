#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Compares the Figma model built from hirobius.tokens.json against the committed Figma snapshot (figma/snapshot.json) and reports missing, extra and changed variables, modes and styles.
 *
 * `pnpm check:figma-drift`. The snapshot is Figma as of the last
 * `pnpm figma:snapshot` (Professional and Organization plans cannot read
 * variables from CI), so the report warns when the snapshot is older than the
 * last change to hirobius.tokens.json. The diff is the push plan
 * (scripts/lib/figma-drift.mjs), so drift and `pnpm figma:push` always agree.
 *
 * Exit codes: 0 no drift · 1 drift, or a snapshot that fails its checksum ·
 * 2 no snapshot taken yet.
 *
 * Usage:
 *   node scripts/check-figma-drift.mjs [--json]
 *
 * Fixture mode (docs/guardrails/FIXTURE_DIR_HARNESS.md): with FIXTURE_DIR set,
 * hirobius.tokens.json, TOKEN_MIGRATION.md and figma/snapshot.json are read
 * from that directory and the git-based staleness check is skipped.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { loadFigmaInputs } from './lib/figma-inputs.mjs';
import { parseSnapshotFile } from './lib/figma-snapshot.mjs';
import { figmaDrift, formatDrift } from './lib/figma-drift.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * When hirobius.tokens.json last changed: its file time if it has uncommitted
 * edits, else the date of the last commit that touched it. Falls back to the
 * file time outside git. Git runs without inherited GIT_* variables, so a
 * hook's GIT_DIR cannot redirect it to another repository.
 *
 * @param {string} root
 * @returns {string|null} ISO timestamp
 */
export function tokensChangedAt(root) {
  const file = join(root, 'hirobius.tokens.json');
  if (!existsSync(file)) return null;
  const fileTime = () => statSync(file).mtime.toISOString();
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
  const git = (args) =>
    execFileSync('git', args, {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  try {
    if (git(['status', '--porcelain', '--', 'hirobius.tokens.json'])) return fileTime();
    const committed = git(['log', '-1', '--format=%cI', '--', 'hirobius.tokens.json']);
    return committed ? new Date(committed).toISOString() : fileTime();
  } catch {
    return fileTime();
  }
}

/**
 * @param {{ root: string, tokensChangedAt?: string|null, json?: boolean }} options
 *   tokensChangedAt: omit to read it from git; null skips the staleness check.
 * @returns {{ exitCode: 0|1|2, output: string, report?: object }}
 */
export function runDriftCheck({ root, tokensChangedAt: changedAt, json = false }) {
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  if (!existsSync(snapshotPath)) {
    return {
      exitCode: 2,
      output:
        'No Figma snapshot yet (figma/snapshot.json). Push the tokens (pnpm figma:push), take a snapshot (pnpm figma:snapshot), commit it, then run this again.',
    };
  }
  try {
    const { model, renames } = loadFigmaInputs(root);
    const snapshotFile = parseSnapshotFile(readFileSync(snapshotPath, 'utf8'));
    const report = figmaDrift(model, snapshotFile, {
      renames,
      tokensChangedAt: changedAt === undefined ? tokensChangedAt(root) : changedAt,
    });
    return {
      exitCode: report.ok ? 0 : 1,
      output: json ? JSON.stringify(report, null, 2) : formatDrift(report),
      report,
    };
  } catch (error) {
    return { exitCode: 1, output: `✗ check-figma-drift — ${error.message}` };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixtureDir = process.env.FIXTURE_DIR;
  const { exitCode, output } = runDriftCheck({
    root: fixtureDir || ROOT,
    tokensChangedAt: fixtureDir ? null : undefined,
    json: process.argv.includes('--json'),
  });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}
