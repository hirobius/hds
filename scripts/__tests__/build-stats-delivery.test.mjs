// @vitest-environment node
/**
 * Delivery metrics in public/hds-stats.json (folio reads them through
 * hds-facts): computed offline from git, never from the GitHub API, and never a
 * wrong number. A shallow clone (release CI checks out with depth 1) cannot
 * count history, so it computes nothing: it keeps the committed block, which
 * names the commit it was counted at, or omits the field when there is none.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectDelivery, mainDelivery, pickDelivery, prOfSubject } from '../build-stats-json.mjs';

const dirs = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const git = (cwd, ...args) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@example.com',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@example.com',
    },
  }).trim();

function repo() {
  const root = mkdtempSync(join(tmpdir(), 'hds-delivery-'));
  dirs.push(root);
  git(root, 'init', '-q', '-b', 'main');
  writeFileSync(
    join(root, 'CHANGELOG.md'),
    '# @hirobius/design-system\n\n## 0.2.0\n\n### Minor Changes\n\n## 0.1.0\n\n### Patch Changes\n',
  );
  const commit = (subject, date) => {
    writeFileSync(join(root, 'f.txt'), subject);
    git(root, 'add', '-A');
    execFileSync('git', ['commit', '-q', '-m', subject], {
      cwd: root,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 't',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@example.com',
        GIT_AUTHOR_DATE: `${date}T12:00:00Z`,
        GIT_COMMITTER_DATE: `${date}T12:00:00Z`,
      },
    });
  };
  commit('chore: first', '2026-07-01');
  commit('feat(x): one (#3)', '2026-07-02');
  commit('fix(y): two (#7)', '2026-07-03');
  commit('docs: no pr', '2026-07-04');
  commit('Merge pull request #9 from hirobius/claude/z', '2026-07-05');
  commit('fix: revert (#3) again (#11)', '2026-07-06');
  // main is the commit before the branch work below.
  git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  commit('feat: on a branch, not on main yet (#12)', '2026-07-07');
  return root;
}

describe('collectDelivery', () => {
  it('counts at the merge-base with origin/main: commits, merged PRs (squash or merge commit), days and CHANGELOG versions', () => {
    const root = repo();
    const base = git(root, 'rev-parse', 'origin/main');
    expect(collectDelivery(root)).toEqual({
      commitsOnMain: 6,
      // #3, #7, #11 (the last "(#N)" of a subject) and #9 (a merge commit).
      // The branch commit (#12) is not on main yet.
      mergedPullRequests: 4,
      firstCommitDate: '2026-07-01',
      changelogVersions: 2,
      asOf: base,
      asOfDate: '2026-07-06',
    });
  });

  it('counts nothing without an origin/main to anchor on', () => {
    const root = repo();
    git(root, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(collectDelivery(root)).toBeNull();
  });

  it('counts nothing in a shallow clone, which cannot see the history', () => {
    const root = repo();
    const shallow = mkdtempSync(join(tmpdir(), 'hds-delivery-shallow-'));
    dirs.push(shallow);
    git(shallow, 'clone', '-q', '--depth', '1', `file://${root}`, '.');
    expect(collectDelivery(shallow)).toBeNull();
  });

  it('counts nothing outside a git checkout', () => {
    const root = mkdtempSync(join(tmpdir(), 'hds-delivery-nogit-'));
    dirs.push(root);
    expect(collectDelivery(root)).toBeNull();
  });
});

describe('prOfSubject', () => {
  it('reads a merge commit by its leading "Merge pull request #N"', () => {
    expect(prOfSubject('Merge pull request #1280 from hirobius/claude/docs-baselines-stale2')).toBe(
      1280,
    );
  });

  it('reads a squash subject by its last "(#N)"', () => {
    expect(prOfSubject('feat(x): thing (#933) (#982)')).toBe(982);
    expect(prOfSubject('fix: y (hds#1274) (#1287)')).toBe(1287);
  });

  it('a merge commit wins over a "(#N)" in its branch name or text', () => {
    expect(prOfSubject('Merge pull request #14 from x/fix-(#2)')).toBe(14);
  });

  it('names no PR for a plain commit', () => {
    expect(prOfSubject('chore: tidy')).toBeNull();
    expect(prOfSubject('docs: see hds#12')).toBeNull();
  });
});

describe('pickDelivery', () => {
  const fresh = {
    commitsOnMain: 9,
    mergedPullRequests: 4,
    firstCommitDate: '2026-07-01',
    changelogVersions: 2,
    asOf: 'b',
    asOfDate: '2026-07-09',
  };
  const committed = { ...fresh, commitsOnMain: 8, asOf: 'a', asOfDate: '2026-07-08' };

  it('only an explicit --delivery refresh takes a fresh count', () => {
    expect(pickDelivery({ fresh, committed, refresh: true })).toBe(fresh);
  });

  it('every other run (write or --check) keeps the committed block, so parallel PRs do not conflict', () => {
    expect(pickDelivery({ fresh, committed, refresh: false })).toBe(committed);
  });

  it('a refresh that cannot count keeps the committed block, and omits the field when there is none', () => {
    expect(pickDelivery({ fresh: null, committed, refresh: true })).toBe(committed);
    expect(pickDelivery({ fresh: null, committed: undefined, refresh: true })).toBeUndefined();
  });
});

// The hds-generated merge driver keeps ours where both sides changed nearby
// lines. A branch without `delivery` merging main kept its own side, and the
// post-merge regen kept that, because the block is held, not recomputed
// (hds#1332 review). The committed block on origin/main is the fallback.
describe('a working file that lost its delivery block', () => {
  const block = {
    commitsOnMain: 5,
    mergedPullRequests: 4,
    firstCommitDate: '2026-07-01',
    changelogVersions: 2,
    asOf: 'abc',
    asOfDate: '2026-07-05',
  };

  it('mainDelivery reads the block committed on origin/main', () => {
    const root = repo();
    mkdirSync(join(root, 'public'), { recursive: true });
    writeFileSync(join(root, 'public/hds-stats.json'), JSON.stringify({ delivery: block }));
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'stats');
    git(root, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    writeFileSync(join(root, 'public/hds-stats.json'), JSON.stringify({}));
    expect(mainDelivery(root)).toEqual(block);
  });

  it('mainDelivery is undefined without origin/main or without the file there', () => {
    const root = repo();
    expect(mainDelivery(root)).toBeUndefined();
    git(root, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(mainDelivery(root)).toBeUndefined();
  });

  it('pickDelivery falls back to main when the working file has none', () => {
    expect(pickDelivery({ fresh: null, committed: undefined, onMain: block, refresh: false })).toBe(
      block,
    );
    expect(pickDelivery({ fresh: null, committed: undefined, onMain: block, refresh: true })).toBe(
      block,
    );
  });

  it('a committed block still wins over main, and a fresh count over both', () => {
    const committed = { ...block, asOf: 'branch' };
    const fresh = { ...block, asOf: 'fresh' };
    expect(pickDelivery({ fresh: null, committed, onMain: block, refresh: false })).toBe(committed);
    expect(pickDelivery({ fresh, committed, onMain: block, refresh: true })).toBe(fresh);
  });
});
