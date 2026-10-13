/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-exemptions.mjs
 *
 * Keeps escape hatches visible and well-formed.
 *
 * Checks:
 *   1. known exemption markers only
 *   2. every exemption marker includes a non-empty reason after the colon
 *   3. prints a summary count by exemption type so drift stays inspectable
 *
 * Usage: pnpm check:exemptions
 */

import { readFileSync } from 'fs';
import { relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scanSources, EXEMPTION_MARKERS } from './lib/source-scan.mjs';

const __scriptDir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__scriptDir, '..');

const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

const SCAN_ROOTS = ['src', 'scripts'];

const SKIP_DIRS = ['node_modules', '.git', 'dist'];
const ALLOWED_EXTS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.md'];
// The vocabulary lives in lib/source-scan.mjs, next to suppressionFor, so a gate
// cannot honor a marker this one rejects.
const MARKERS = EXEMPTION_MARKERS;

const markerPattern = new RegExp(`\\b(${MARKERS.join('|')}):\\s*(.*)$`);
const unknownPattern = /\b([a-z-]+-ok):/i;

const violations = [];
const counts = new Map();

const filesToScan =
  isFixtureMode && fixtureFile
    ? [resolve(fixtureFile)]
    : scanSources({
        root: ROOT,
        gate: 'check-exemptions',
        roots: SCAN_ROOTS,
        exts: ALLOWED_EXTS,
        skipDirs: SKIP_DIRS,
        includeSpecs: true,
      });

for (const file of filesToScan) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const lines = readFileSync(file, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [...line.matchAll(new RegExp(unknownPattern, 'g'))];

    for (const match of matches) {
      const key = match[1];
      if (!MARKERS.includes(key)) {
        violations.push(`${rel}:${i + 1} unknown exemption marker "${key}"`);
      }
    }

    const markerMatch = line.match(markerPattern);
    if (!markerMatch) continue;

    const [, marker, reason] = markerMatch;
    const trimmedReason = reason.trim();
    counts.set(marker, (counts.get(marker) ?? 0) + 1);

    if (trimmedReason.length < 3) {
      violations.push(`${rel}:${i + 1} exemption "${marker}" is missing a usable reason`);
    }
  }
}

if (violations.length > 0) {
  console.error(`\n✗ Exemption check failed — ${violations.length} issue(s).\n`);
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  console.error('');
  process.exit(1);
}

console.log('\n✓ Exemption check passed — all escape hatches are known and reasoned.\n');

if (counts.size > 0) {
  console.log('Exemption summary:');
  for (const marker of MARKERS) {
    const count = counts.get(marker);
    if (!count) continue;
    console.log(`  ${marker}: ${count}`);
  }
  console.log('');
}
