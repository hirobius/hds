// @vitest-environment node
/**
 * Delivery metrics in public/hds-stats.json (folio reads them through
 * hds-facts): computed offline from git, never from the GitHub API, and never a
 * wrong number. A shallow clone (release CI checks out with depth 1) cannot
 * count history, so it computes nothing: it keeps the committed block, which
 * names the commit it was counted at, or omits the field when there is none.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectDelivery, pickDelivery } from '../build-stats-json.mjs';

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
  return root;
}

describe('collectDelivery', () => {
  it('counts commits, merged PRs (squash "(#N)" and merge commits), the first-commit day and the CHANGELOG releases', () => {
    const root = repo();
    expect(collectDelivery(root)).toEqual({
      commitsOnMain: 5,
      mergedPullRequests: 3,
      firstCommitDate: '2026-07-01',
      releases: 2,
      asOf: git(root, 'rev-parse', 'HEAD'),
    });
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

describe('pickDelivery', () => {
  const fresh = {
    commitsOnMain: 9,
    mergedPullRequests: 4,
    firstCommitDate: '2026-07-01',
    releases: 2,
    asOf: 'b',
  };
  const committed = { ...fresh, commitsOnMain: 8, asOf: 'a' };

  it('a write in a full clone takes the fresh count', () => {
    expect(pickDelivery({ fresh, committed, check: false })).toBe(fresh);
  });

  it('--check keeps the committed block: the count moves with every commit, like generatedFrom', () => {
    expect(pickDelivery({ fresh, committed, check: true })).toBe(committed);
  });

  it('a shallow clone keeps the committed block, and omits the field when there is none', () => {
    expect(pickDelivery({ fresh: null, committed, check: false })).toBe(committed);
    expect(pickDelivery({ fresh: null, committed: undefined, check: false })).toBeUndefined();
  });
});
