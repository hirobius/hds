#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-token-rebake-needed.mjs
 *
 * Pre-commit guard: ensure generated token outputs are in sync with
 * `hirobius.tokens.json`. A commit that edits the source but skips the
 * rebake silently ships drift; this catches that.
 *
 * What it does:
 *   1. Runs `node scripts/generate-manifest.mjs` and `node scripts/build-tokens.mjs`
 *      (the same chain the `tokens` package script invokes for the
 *      generator-only steps).
 *   2. Diffs each generated output against HEAD.
 *   3. For `public/hds-manifest.json`, the `generated` ISO-timestamp field
 *      is stripped before comparison — every rebake stamps a new value
 *      there, but it does not constitute meaningful drift.
 *   4. Exits 0 if every output matches HEAD; exits 1 with a diagnostic
 *      listing the drifted files otherwise.
 *
 * Wired into `.husky/pre-commit` after `pnpm typecheck`.
 *
 * Manual invocation:
 *   node scripts/check-token-rebake-needed.mjs
 *   node scripts/check-token-rebake-needed.mjs --verbose
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

// Fixture mode: directory fixture for proof-of-firing
// (see docs/guardrails/FIXTURE_DIR_HARNESS.md).
// When FIXTURE_DIR is set, skip the build-chain entirely and compare each
// generated output against a sibling "<file>.head" snapshot that represents
// what was committed at HEAD.  No-op in normal runs (FIXTURE_DIR unset).
const FIXTURE_DIR = process.env.FIXTURE_DIR;

const GENERATED_OUTPUTS = [
  'src/styles/tokens.css',
  'src/styles/tokens.generated.css',
  'src/app/design-system/generated-tokens.ts',
  'src/app/design-system/generated-token-values.ts',
  'src/app/design-system/generated-token-descriptions.ts',
  'src/app/design-system/generated-token-vars.d.ts',
  'src/app/design-system/generated-token-refs.ts',
  'tailwind.config.tokens.cjs',
  'public/hds-manifest.json',
];

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    process.stderr.write(err.stdout || '');
    process.stderr.write(err.stderr || '');
    throw err;
  }
}

function gitShow(rev, file) {
  try {
    return execSync(`git show ${rev}:${file}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

/**
 * Strip the `generated` timestamp field from a hds-manifest.json string
 * so it can be compared without false-positives on every rebake.
 */
export function stripManifestTimestamp(json) {
  try {
    const parsed = JSON.parse(json);
    // Recursively strip timestamp fields anywhere in the tree. The manifest
    // carries a top-level `generated` plus nested `generatedAt` under
    // systemHealth and other auto-emitted blocks; non-recursive strip left
    // those nested timestamps in place, causing "content differs" in the
    // rebake-check loop on every commit.
    const TS_KEYS = new Set(['generated', 'generatedAt', 'capturedAt']);
    const walk = (node) => {
      if (Array.isArray(node)) {
        for (const v of node) walk(v);
        return;
      }
      if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (TS_KEYS.has(k)) delete node[k];
          else walk(node[k]);
        }
      }
    };
    walk(parsed);
    return JSON.stringify(parsed);
  } catch {
    return json;
  }
}

function fileDiffersFromHead(file) {
  const headContent = gitShow('HEAD', file);
  const stagedContent = gitShow(':0', file); // staged index, if any
  const wtPath = path.join(ROOT, file);
  if (!fs.existsSync(wtPath)) {
    return { differs: true, reason: 'file deleted from working tree' };
  }
  const wtContent = fs.readFileSync(wtPath, 'utf8');
  if (headContent === null && stagedContent === null) {
    return { differs: true, reason: 'file untracked at HEAD' };
  }
  // The user may have already rebaked + staged the new output. Accept disk
  // matching EITHER head OR staged-index — the staged version is what's
  // about to land in the next commit, so it's the correct reference for
  // "are the generated outputs in sync with the build chain?".
  const norm = (s) =>
    s == null ? null : file === 'public/hds-manifest.json' ? stripManifestTimestamp(s) : s;
  const wtNorm = norm(wtContent);
  if (norm(headContent) === wtNorm) return { differs: false };
  if (norm(stagedContent) === wtNorm) return { differs: false };
  const reason =
    file === 'public/hds-manifest.json' ? 'content differs (timestamp ignored)' : 'content differs';
  return { differs: true, reason };
}

/**
 * Fixture-mode comparison: read the working-tree file and its ".head"
 * sibling from FIXTURE_DIR and report drift without running any build script.
 */
function fixtureFileDiffers(file) {
  const wtPath = path.join(FIXTURE_DIR, file);
  const headPath = `${wtPath}.head`;
  if (!fs.existsSync(wtPath)) {
    // Only files present in the fixture are checked; skip absent files.
    return { differs: false };
  }
  if (!fs.existsSync(headPath)) {
    // No snapshot means the file was not committed at HEAD in this fixture.
    return { differs: true, reason: 'file untracked at HEAD' };
  }
  const wtContent = fs.readFileSync(wtPath, 'utf8');
  const headContent = fs.readFileSync(headPath, 'utf8');
  const norm = (s) => (file === 'public/hds-manifest.json' ? stripManifestTimestamp(s) : s);
  if (norm(headContent) === norm(wtContent)) return { differs: false };
  return { differs: true, reason: 'content differs' };
}

function main() {
  // --- FIXTURE MODE ---
  // When FIXTURE_DIR is set, skip the build chain and compare static snapshot
  // pairs: <file> (working tree) vs <file>.head (committed HEAD equivalent).
  if (FIXTURE_DIR) {
    const drifted = [];
    for (const file of GENERATED_OUTPUTS) {
      const result = fixtureFileDiffers(file);
      if (result.differs) drifted.push({ file, reason: result.reason });
    }
    if (drifted.length === 0) {
      if (VERBOSE) process.stderr.write('OK — no token-output drift (fixture mode)\n');
      return 0;
    }
    process.stderr.write('TOKEN REBAKE REQUIRED (fixture mode):\n');
    for (const { file, reason } of drifted) {
      process.stderr.write(`  - ${file}  (${reason})\n`);
    }
    return 1;
  }

  // --- NORMAL MODE ---
  // This is a CHECK gate: it MUST be side-effect-free on the working tree.
  // It regenerates the build-chain outputs to compare them against HEAD, then
  // restores the originals in a `finally`. Without this, the gate left
  // public/hds-manifest.json as the un-enriched base form (57 vs the committed
  // enriched 65), polluting the tree on every pre-commit/post-commit run and
  // oscillating the manifest 65↔57.
  const PROTECTED = [...GENERATED_OUTPUTS, 'src/app/data/component-api.json'];
  const backup = new Map();
  for (const file of PROTECTED) {
    const p = path.join(ROOT, file);
    if (fs.existsSync(p)) backup.set(p, fs.readFileSync(p));
  }

  const drifted = [];
  try {
    // Regenerate the SAME chain that produces the committed manifest
    // (manifest:generate = generate-manifest + generate-component-api +
    // enrich-manifest), plus the token build — so the comparison is
    // apples-to-apples and the enrich stubs aren't a false-positive.
    if (VERBOSE) process.stderr.write('Regenerating manifest + token build chain ...\n');
    run('node scripts/generate-manifest.mjs');
    run('node scripts/generate-component-api.mjs');
    run('node scripts/enrich-manifest.mjs');
    run('node scripts/build-tokens.mjs');

    for (const file of GENERATED_OUTPUTS) {
      const result = fileDiffersFromHead(file);
      if (result.differs) drifted.push({ file, reason: result.reason });
    }
  } finally {
    for (const [p, content] of backup) fs.writeFileSync(p, content);
  }

  if (drifted.length === 0) {
    if (VERBOSE) process.stderr.write('OK — no token-output drift\n');
    return 0;
  }

  process.stderr.write('TOKEN REBAKE REQUIRED:\n');
  for (const { file, reason } of drifted) {
    process.stderr.write(`  - ${file}  (${reason})\n`);
  }
  process.stderr.write(
    '\nThe generated outputs above are stale vs the build chain. The token/manifest\n' +
      'source was edited without re-running the build. Rebake and stage the outputs:\n\n' +
      '  pnpm tokens && pnpm manifest:generate\n' +
      `  git add ${drifted.map((d) => d.file).join(' ')}\n\n` +
      'Then re-attempt the commit. (This check restores the working tree, so it does\n' +
      'not leave the regenerated files in place.)\n',
  );
  return 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(main());
}
