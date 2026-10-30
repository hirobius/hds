#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * regen.mjs — rebuild every committed generated file in dependency order (hds#977).
 *
 * Why: the files below are rebuilt from source by their generators, and their
 * `--check` gates (pretest) already fail when one is stale, so a merge conflict
 * in one is never real. Before this, every PR that landed re-conflicted the
 * other open PRs in them, and each was resolved by hand, which once dropped a
 * real line of button.tsx (#950). Now a merge keeps going and one command
 * brings them back in line:
 *
 *   - `.gitattributes` gives them `merge=hds-generated`, a driver
 *     (scripts/merge-generated.mjs) that never stops a merge on them;
 *   - `node scripts/setup-hooks.mjs` (pnpm install's `prepare`) registers that
 *     driver in .git/config, since git never reads a driver from the repo;
 *   - `.husky/post-merge` and `.husky/post-rewrite` run `--after-merge`, which
 *     regenerates only when the driver ran.
 *
 *   pnpm regen                                # rebuild them all
 *   node scripts/regen.mjs --after-merge      # rebuild only if the driver ran, then say what to commit
 *   node scripts/regen.mjs --list             # print the generated files, one per line
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The generators, in the order their inputs need: the manifest and component
 * API first (sync-map, stats, README counts and llms read them), DESIGN.md
 * before llms-full.txt (it embeds it). `files` are what each one writes that
 * `.gitattributes` marks `merge=hds-generated`.
 */
export const STEPS = [
  { run: ['scripts/generate-manifest.mjs'], files: ['public/hds-manifest.json'] },
  { run: ['scripts/generate-component-api.mjs'], files: [] },
  { run: ['scripts/upgrade/props.mjs'], files: [] },
  { run: ['scripts/enrich-manifest.mjs'], files: [] },
  { run: ['scripts/upgrade/types.mjs'], files: ['docs/api/types-baseline.json'] },
  { run: ['scripts/check-sync-map.mjs', '--write'], files: ['docs/sync-map.json'] },
  { run: ['scripts/build-handoff.mjs'], files: ['DESIGN-HANDOFF.md'] },
  { run: ['scripts/build-design-md.mjs'], files: ['DESIGN.md'] },
  { run: ['scripts/build-readme-counts.mjs'], files: ['README.md'] },
  { run: ['scripts/build-stats-json.mjs'], files: ['public/hds-stats.json'] },
  { run: ['scripts/generate-llms-txt.mjs'], files: ['public/llms-full.txt'] },
];

export const GENERATED_FILES = STEPS.flatMap((step) => step.files);

/** Where scripts/merge-generated.mjs records that it ran, inside the git dir. */
export const MARKER = 'hds-regen-needed';

function gitDir(root) {
  const res = spawnSync('git', ['rev-parse', '--absolute-git-dir'], {
    cwd: root,
    encoding: 'utf8',
  });
  return res.status === 0 ? res.stdout.trim() : null;
}

export function markerPath(root = ROOT) {
  const dir = gitDir(root);
  return dir ? join(dir, MARKER) : null;
}

/** Run every step; returns false (after printing the step) on the first failure. */
export function regen(root = ROOT, { log = console.log } = {}) {
  for (const step of STEPS) {
    log(`regen: node ${step.run.join(' ')}`);
    const res = spawnSync(process.execPath, step.run, { cwd: root, stdio: 'inherit' });
    if (res.status !== 0) {
      console.error(`✗ regen: node ${step.run.join(' ')} exited ${res.status}`);
      return false;
    }
  }
  return true;
}

function changedGenerated(root) {
  const res = spawnSync('git', ['diff', '--name-only', '--', ...GENERATED_FILES], {
    cwd: root,
    encoding: 'utf8',
  });
  return res.stdout.split('\n').filter(Boolean);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--list')) {
    console.log(GENERATED_FILES.join('\n'));
    process.exit(0);
  }
  if (argv.includes('--after-merge')) {
    const marker = markerPath();
    if (!marker || !existsSync(marker)) process.exit(0);
    rmSync(marker);
    console.log('regen: the merge kept one side of a generated file; rebuilding them (hds#977)');
    // A hook must not fail the merge it follows: report and leave the fix to `pnpm regen`.
    if (!regen(ROOT)) {
      console.error('✗ regen failed; fix the error above, then run: pnpm regen');
      process.exit(0);
    }
    const changed = changedGenerated(ROOT);
    console.log(
      changed.length
        ? `regen: rebuilt ${changed.join(', ')}; commit them`
        : 'regen: generated files already match their sources',
    );
    process.exit(0);
  }
  process.exit(regen(ROOT) ? 0 : 1);
}
