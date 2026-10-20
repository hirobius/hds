#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * release-local — publish @hirobius/design-system from a laptop, no GitHub Actions.
 *
 * Why (ops#771): the repos went private, Actions minutes are billed, and the
 * org hit its spending limit, so `.github/workflows/release.yml` cannot run.
 * This is the same release, run by hand: the same build and consumer smoke as
 * `pnpm release`, then `changeset publish`.
 *
 * Usage:
 *   pnpm release:local             dry run (default): every check, the build,
 *                                  the smoke, and `pnpm publish --dry-run`.
 *                                  Needs no npm login and publishes nothing.
 *   pnpm release:local --publish   the real publish. Same steps, then
 *                                  `changeset publish` (npm asks for your 2FA).
 *   --ref <git ref>                what HEAD must equal (default origin/main).
 *
 * It refuses to publish unless HEAD is a clean checkout of origin/main with no
 * pending .changeset/*.md. Versioning stays a reviewed PR (`pnpm
 * changeset:version` on a branch, the "Version Packages" PR), so what lands on
 * npm is always exactly what is on main. If the version on main is already on
 * npm, it says so and stops.
 *
 * Provenance: local publishes carry no npm provenance (it came from OIDC in
 * Actions); don't add --provenance, it fails outside a supported CI.
 *
 * Auth: your own `npm login` session (an account with publish rights on the
 * package). No token is read from or written to any file by this script.
 * `changeset publish` tags the commit locally (v<version>); hds CLAUDE.md
 * forbids pushing from a laptop, so the tag stays local.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = '@hirobius/design-system';

export function parseArgs(argv) {
  const opts = { publish: false, ref: 'origin/main' };
  let refGiven = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--publish') opts.publish = true;
    else if (a === '--dry-run') opts.publish = false;
    else if (a === '--ref') {
      opts.ref = argv[++i];
      refGiven = true;
    } else if (a.startsWith('--ref=')) {
      opts.ref = a.slice('--ref='.length);
      refGiven = true;
    } else throw new Error(`Unknown option: ${a}`);
  }
  if (!opts.ref) throw new Error('--ref needs a git ref');
  if (refGiven && opts.publish) {
    throw new Error('--ref is for dry runs only; publish runs from origin/main');
  }
  return opts;
}

/** Changeset entries waiting to be versioned (README.md and config are not entries). */
export function pendingChangesets(fileNames) {
  return fileNames.filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
}

/**
 * Decide whether to go. Pure: every input is read by the caller.
 * @returns {{ go: boolean, nothingToDo: boolean, problems: string[] }}
 */
export function preflight(s) {
  const problems = [];
  if (s.dirty) {
    problems.push(
      'The working tree has changes. Commit or stash them, so what you publish is exactly main.',
    );
  }
  if (s.head !== s.refSha) {
    problems.push(
      `HEAD (${short(s.head)}) is not ${s.ref} (${short(s.refSha)}). Run: git checkout main && git pull --ff-only`,
    );
  }
  if (s.pending.length > 0) {
    problems.push(
      `${s.pending.length} changeset(s) are not versioned yet (${s.pending.join(', ')}). ` +
        'Merge the "Version Packages" PR (pnpm changeset:version on a branch) first, then pull main.',
    );
  }
  const nothingToDo = s.published.includes(s.version);
  if (s.publish && !nothingToDo && !s.npmUser) {
    problems.push('npm is not logged in. Run: npm login   (then run this again)');
  }
  return { go: problems.length === 0 && !nothingToDo, nothingToDo, problems };
}

/** The final step: a dry pack-and-report, or the real publish. */
export function publishStep(publish) {
  return publish
    ? ['pnpm', ['exec', 'changeset', 'publish']]
    : ['pnpm', ['publish', '--dry-run', '--no-git-checks']];
}

/** Every command a go run executes, in order. */
export function runSteps(publish) {
  return [
    ['pnpm', ['install', '--frozen-lockfile']],
    ['pnpm', ['build:lib']],
    ['pnpm', ['smoke:consumer', '--skip-build']],
    publishStep(publish),
  ];
}

/** A failed fetch means origin/main may be stale; stop rather than compare against it. */
export function fetchMainOrThrow(result) {
  if (!result.ok) {
    throw new Error(
      `Could not fetch origin/main; check your network and retry.${result.err ? ` (${result.err.split('\n')[0]})` : ''}`,
    );
  }
}

function short(sha) {
  return sha ? sha.slice(0, 7) : '(none)';
}

function capture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function run(cmd, args) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(
      `\nrelease-local: "${cmd} ${args.join(' ')}" failed (exit ${r.status}). Nothing was published.`,
    );
    process.exit(1);
  }
}

function readState(opts) {
  fetchMainOrThrow(capture('git', ['fetch', '--quiet', 'origin', 'main']));
  const version = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const view = capture('npm', ['view', PKG, 'versions', '--json']);
  let published = [];
  if (view.ok) {
    const parsed = JSON.parse(view.out || '[]');
    published = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    throw new Error(`Could not read ${PKG} from the npm registry: ${view.err.split('\n')[0]}`);
  }
  const who = opts.publish ? capture('npm', ['whoami']) : { ok: false, out: '' };
  return {
    publish: opts.publish,
    ref: opts.ref,
    dirty: capture('git', ['status', '--porcelain']).out !== '',
    head: capture('git', ['rev-parse', 'HEAD']).out,
    refSha: capture('git', ['rev-parse', '--verify', '--quiet', opts.ref]).out,
    pending: pendingChangesets(readdirSync(path.join(ROOT, '.changeset'))),
    version,
    published,
    npmUser: who.ok ? who.out : null,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const mode = opts.publish ? 'PUBLISH' : 'DRY RUN';
  const s = readState(opts);
  console.log(`release-local (${mode}): ${PKG}@${s.version}${s.npmUser ? ` as ${s.npmUser}` : ''}`);

  const verdict = preflight(s);
  if (verdict.problems.length) {
    console.error('\nNot ready:');
    for (const p of verdict.problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (verdict.nothingToDo) {
    console.log(`\n${PKG}@${s.version} is already on npm. Nothing to publish.`);
    return;
  }

  for (const [cmd, args] of runSteps(opts.publish)) run(cmd, args);

  if (!opts.publish) {
    console.log(
      `\nDry run passed: ${PKG}@${s.version} is ready. Publish with: pnpm release:local --publish`,
    );
    return;
  }
  const check = capture('npm', ['view', `${PKG}@${s.version}`, 'version']);
  if (check.out !== s.version) {
    console.error(
      `\nchangeset publish finished but npm does not list ${s.version} yet. Check https://www.npmjs.com/package/${PKG}`,
    );
    process.exit(1);
  }
  console.log(
    `\nPublished ${PKG}@${s.version}. The v${s.version} git tag is local only; do not push it from this machine.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`release-local: ${e.message}`);
    process.exit(1);
  }
}
