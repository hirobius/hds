#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * run-lint-staged.mjs — the pre-commit hook's lint-staged entry point (ops#493).
 *
 *   node scripts/run-lint-staged.mjs [lint-staged args...]
 *
 * Why it exists: `git commit -a` (and `git commit <path>`) run pre-commit with
 * GIT_INDEX_FILE pointing at the index git is about to commit (.git/index.lock
 * or .git/next-index-*.lock), while the default .git/index still has nothing
 * staged. lint-staged 17 finds the staged files through that variable, then
 * UNSETS it before its final "anything still staged?" check, reads the stale
 * default index, sees nothing, and aborts with "Prevented an empty git commit!"
 * (leaving its "lint-staged automatic backup" stash behind).
 *
 * Fix, without weakening the gate: when GIT_INDEX_FILE is set, pass
 * --allow-empty (git itself still refuses a truly empty commit), then re-stage
 * prettier's edits into the index git will commit. Leftover backup stashes whose
 * content already equals the working tree are dropped (nothing can be lost).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BACKUP_SUBJECT = 'lint-staged automatic backup';

/** Env for plain git calls: never inherit the commit's temporary index. */
function plainEnv(env) {
  const e = { ...env };
  delete e.GIT_INDEX_FILE;
  return e;
}

function git(args, { cwd, env }) {
  return spawnSync('git', args, { cwd, env, encoding: 'utf8' });
}

/**
 * Drop lint-staged backup stashes that are provably redundant: the tracked
 * working tree already equals the stash's tree. Returns the dropped shas.
 */
export function cleanLeftoverBackups({ cwd = process.cwd(), env = process.env } = {}) {
  const e = plainEnv(env);
  const list = git(['stash', 'list', '--format=%gd%x09%H%x09%s'], { cwd, env: e });
  if (list.status !== 0) return [];
  const dropped = [];
  const rows = list.stdout
    .split('\n')
    .map((l) => l.split('\t'))
    .filter(([, , subject]) => subject?.includes(BACKUP_SUBJECT));
  // Highest index first so earlier drops don't renumber later ones.
  for (const [ref, sha] of rows.reverse()) {
    if (git(['diff', '--quiet', sha], { cwd, env: e }).status === 0) {
      git(['stash', 'drop', '-q', ref], { cwd, env: e });
      dropped.push(sha);
    }
  }
  return dropped;
}

/** Run lint-staged with the `commit -a` fix. Returns its exit status. */
export function runLintStaged(args, { cwd = process.cwd(), env = process.env } = {}) {
  cleanLeftoverBackups({ cwd, env });
  const partialIndex = Boolean(env.GIT_INDEX_FILE);
  const full = partialIndex && !args.includes('--allow-empty') ? [...args, '--allow-empty'] : args;
  const r = spawnSync('pnpm', ['exec', 'lint-staged', ...full], { cwd, env, stdio: 'inherit' });
  const code = r.status ?? 1;
  if (code === 0 && partialIndex) {
    // lint-staged re-staged into the default index; the commit uses ours.
    git(['update-index', '--again'], { cwd, env });
  }
  return code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runLintStaged(process.argv.slice(2)));
}
