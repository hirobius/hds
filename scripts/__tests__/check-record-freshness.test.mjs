/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for scripts/check-record-freshness.mjs (hds#249).
 *
 * The pure functions take in-memory commit fixtures, so these run with no
 * git process and no filesystem writes. A separate CLI-integration test
 * (check-record-freshness.cli.test.mjs) proves the real `git log`/`git
 * diff-tree` wiring against this repo's own history.
 */

import { describe, it, expect } from 'vitest';
import {
  checkChangesetPresence,
  checkStatusFreshness,
  newestTouching,
  touchesWatchedPath,
} from '../check-record-freshness.mjs';

const commit = (overrides) => ({
  sha: 'deadbeef',
  date: '2026-09-20T00:00:00Z',
  message: 'chore: something',
  files: [],
  ...overrides,
});

describe('touchesWatchedPath', () => {
  it('matches a file under a watched prefix', () => {
    expect(touchesWatchedPath('src/app/components/button.tsx', ['src/'])).toBe(true);
  });

  it('does not match a file outside every prefix', () => {
    expect(touchesWatchedPath('docs/guardrails/registry.json', ['src/', 'scripts/'])).toBe(false);
  });
});

describe('newestTouching', () => {
  it('returns null when nothing touches the watched prefixes', () => {
    const commits = [commit({ files: ['README.md'] })];
    expect(newestTouching(commits, ['src/'])).toBeNull();
  });

  it('returns the latest-dated matching commit, not just the last in the array', () => {
    const commits = [
      commit({ sha: 'aaa', date: '2026-09-01T00:00:00Z', files: ['src/a.ts'] }),
      commit({ sha: 'bbb', date: '2026-09-20T00:00:00Z', files: ['src/b.ts'] }),
      commit({ sha: 'ccc', date: '2026-09-10T00:00:00Z', files: ['src/c.ts'] }),
    ];
    expect(newestTouching(commits, ['src/'])?.sha).toBe('bbb');
  });
});

describe('checkStatusFreshness', () => {
  it('passes when no pushed commit touches a watched path', () => {
    const commits = [commit({ date: '2026-09-24T00:00:00Z', files: ['README.md'] })];
    expect(checkStatusFreshness(commits, '2026-01-01T00:00:00Z').ok).toBe(true);
  });

  it('passes when status.json is at least as new as the newest watched commit', () => {
    const commits = [commit({ date: '2026-09-20T00:00:00Z', files: ['scripts/foo.mjs'] })];
    expect(checkStatusFreshness(commits, '2026-09-20T00:00:00Z').ok).toBe(true);
    expect(checkStatusFreshness(commits, '2026-09-21T00:00:00Z').ok).toBe(true);
  });

  it('fails and names the newest offending commit when status.json is older', () => {
    const commits = [
      commit({ sha: 'aaa', date: '2026-09-19T00:00:00Z', files: ['docs/adr/030-x.md'] }),
      commit({ sha: 'bbb', date: '2026-09-23T00:00:00Z', files: ['src/x.ts'] }),
    ];
    const result = checkStatusFreshness(commits, '2026-09-20T00:00:00Z');
    expect(result.ok).toBe(false);
    expect(result.newest.sha).toBe('bbb');
  });
});

describe('checkChangesetPresence', () => {
  it('passes when no pushed commit touches src/', () => {
    const commits = [commit({ files: ['scripts/foo.mjs', 'docs/x.md'] })];
    expect(checkChangesetPresence(commits, []).ok).toBe(true);
  });

  it('passes when a src/ commit exists and a changeset is pending', () => {
    const commits = [commit({ files: ['src/index.ts'] })];
    expect(checkChangesetPresence(commits, ['brave-lions-jump.md']).ok).toBe(true);
  });

  it('passes when a src/ commit carries a skip-changeset marker, even with no pending changeset', () => {
    const commits = [commit({ files: ['src/index.ts'], message: 'fix: typo\n\nskip-changeset' })];
    expect(checkChangesetPresence(commits, []).ok).toBe(true);
  });

  it('fails and names the offending commit(s) when neither is present', () => {
    const commits = [
      commit({ sha: 'aaa', files: ['README.md'] }),
      commit({ sha: 'bbb', files: ['src/index.ts'], message: 'feat: new export' }),
    ];
    const result = checkChangesetPresence(commits, []);
    expect(result.ok).toBe(false);
    expect(result.offenders.map((c) => c.sha)).toEqual(['bbb']);
  });
});
