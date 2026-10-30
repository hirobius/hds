/**
 * hds#977: committed generated files no longer stop a merge. `.gitattributes`
 * gives them the `hds-generated` driver (scripts/merge-generated.mjs), which
 * merges what does not overlap and keeps our side where both sides changed the
 * same lines; `pnpm regen` (scripts/regen.mjs) then rebuilds them from source,
 * and .husky/post-merge runs it when the driver ran.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DRIVER, installMergeDriver, pickMerged } from '../merge-generated.mjs';
import { GENERATED_FILES, MARKER, STEPS } from '../regen.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const read = (rel) => readFileSync(join(REPO, rel), 'utf8');

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd, ...args) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (res.status !== 0 && args[0] !== 'merge')
    throw new Error(`git ${args.join(' ')}: ${res.stderr}`);
  return res;
}

/**
 * A repo whose `file` is marked merge=hds-generated, with the driver pointed at
 * this checkout's script, on branch main at `base`.
 */
function repoWith(file, base) {
  const dir = mkdtempSync(join(tmpdir(), 'hds-merge-generated-'));
  dirs.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'test');
  installMergeDriver(dir, join(REPO, 'scripts/merge-generated.mjs'));
  writeFileSync(join(dir, '.gitattributes'), `${file} merge=hds-generated\n`);
  writeFileSync(join(dir, file), base);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return dir;
}

/** Commit `content` to `file` on a new branch `name` from main, then return to main. */
function branch(dir, name, file, content) {
  git(dir, 'checkout', '-q', '-b', name, 'main');
  writeFileSync(join(dir, file), content);
  git(dir, 'commit', '-q', '-am', name);
  git(dir, 'checkout', '-q', 'main');
}

const gitDir = (dir) => git(dir, 'rev-parse', '--absolute-git-dir').stdout.trim();

describe('the hds-generated merge driver', () => {
  it('finishes a merge both sides changed: their separate edits land, ours wins where they overlap', () => {
    const base = 'count: 10\n\nintro\n\nnotes\n';
    const dir = repoWith('README.md', base);
    branch(dir, 'theirs', 'README.md', 'count: 12\n\nintro\n\nnotes, with their new line\n');
    writeFileSync(join(dir, 'README.md'), 'count: 11\n\nour intro\n\nnotes\n');
    git(dir, 'commit', '-q', '-am', 'ours');

    const res = git(dir, 'merge', '--no-edit', 'theirs');

    expect(res.status).toBe(0);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe(
      'count: 11\n\nour intro\n\nnotes, with their new line\n',
    );
    expect(existsSync(join(gitDir(dir), MARKER))).toBe(true);
  });

  it('keeps our whole JSON file when the line merge would not parse', () => {
    const ours = '{\n  "a": 1\n}\n';
    expect(pickMerged('public/hds-stats.json', '{\n  "a": 1\n  "b": 2\n}\n', ours)).toBe(ours);
    expect(pickMerged('public/hds-stats.json', '{ "b": 2 }\n', ours)).toBe('{ "b": 2 }\n');
    expect(pickMerged('README.md', 'not json', ours)).toBe('not json');
  });

  it('is registered by installMergeDriver under the name .gitattributes uses', () => {
    const dir = repoWith('x.txt', 'x\n');
    expect(git(dir, 'config', `merge.${DRIVER}.driver`).stdout).toMatch(
      /merge-generated\.mjs %O %A %B %P/,
    );
  });
});

describe('repo wiring', () => {
  it('.gitattributes marks exactly the files pnpm regen rebuilds', () => {
    const marked = read('.gitattributes')
      .split('\n')
      .filter((line) => line.includes(`merge=${DRIVER}`))
      .map((line) => line.split(/\s+/)[0]);
    expect(marked.sort()).toEqual([...GENERATED_FILES].sort());
  });

  it('runs every generator as a script that exists, and is pnpm regen', () => {
    for (const step of STEPS) expect(existsSync(join(REPO, step.run[0]))).toBe(true);
    expect(JSON.parse(read('package.json')).scripts.regen).toBe('node scripts/regen.mjs');
  });

  it('installs the driver from setup-hooks (pnpm install) and regenerates after a merge or rebase', () => {
    expect(read('scripts/setup-hooks.mjs')).toContain('installMergeDriver');
    expect(read('.husky/post-merge')).toMatch(/scripts\/regen\.mjs"? --after-merge/);
    expect(read('.husky/post-rewrite')).toMatch(/scripts\/regen\.mjs"? --after-merge/);
  });
});
