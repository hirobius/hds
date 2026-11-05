/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * meta/commit in a shallow clone (release blocker on f5f2c51). actions/checkout
 * fetches depth 1, so the one commit present looks like it added every file and
 * `git log -1 -- <synced inputs>` returns HEAD: every merge would "change"
 * meta/commit and the release gate could never pass. A real repo, cloned at
 * depth 1, proves readFigmaMeta leaves the unknowable value out and that
 * deepening the history recovers the true commit.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { readFigmaMeta, syncedInputsCommit, deepenSyncedHistory } from '../lib/figma-meta.mjs';
import { runMetaGate } from '../check-figma-release.mjs';

const sh = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};

/** origin: commit 1 changes package.json (a synced input); commits 2-3 do not. */
function originWithHistory() {
  const dir = mkdtempSync(join(tmpdir(), 'figma-meta-origin-'));
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 'test@example.com');
  sh(dir, 'config', 'user.name', 'test');
  sh(dir, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));
  sh(dir, 'add', '.');
  sh(dir, 'commit', '-q', '--no-verify', '-m', 'synced input');
  const synced = sh(dir, 'rev-parse', 'HEAD');
  for (const n of [2, 3]) {
    writeFileSync(join(dir, `other-${n}.txt`), String(n));
    sh(dir, 'add', '.');
    sh(dir, 'commit', '-q', '--no-verify', '-m', `other ${n}`);
  }
  return { dir, synced, head: sh(dir, 'rev-parse', 'HEAD') };
}

function shallowClone(origin) {
  const dir = join(mkdtempSync(join(tmpdir(), 'figma-meta-clone-')), 'repo');
  sh(
    tmpdir(),
    '-c',
    'protocol.file.allow=always',
    'clone',
    '-q',
    '--depth',
    '1',
    `file://${origin}`,
    dir,
  );
  return dir;
}

describe('meta/commit in a shallow clone', () => {
  it('a full clone reads the last commit to the synced inputs, not HEAD', () => {
    const { dir, synced } = originWithHistory();
    expect(readFigmaMeta(dir).commit).toBe(synced.slice(0, 7));
    expect(syncedInputsCommit(dir)).toEqual({ sha: synced, complete: true });
  });

  it('a depth-1 clone does not report HEAD as meta/commit; it leaves the value out', () => {
    const { dir: origin, head } = originWithHistory();
    const clone = shallowClone(origin);
    expect(sh(clone, 'rev-parse', '--is-shallow-repository')).toBe('true');
    expect(syncedInputsCommit(clone)).toEqual({ sha: head, complete: false });
    expect(readFigmaMeta(clone).commit).toBeUndefined();
  });

  it('deepening the history recovers the true commit', () => {
    const { dir: origin, synced } = originWithHistory();
    const clone = shallowClone(origin);
    expect(deepenSyncedHistory(clone)).toBe(true);
    expect(syncedInputsCommit(clone)).toEqual({ sha: synced, complete: true });
    expect(readFigmaMeta(clone).commit).toBe(synced.slice(0, 7));
  });

  it('the meta gate refuses, with a clear reason, when the history stays shallow', () => {
    const { dir: origin } = originWithHistory();
    const clone = shallowClone(origin);
    const { exitCode, output } = runMetaGate({ root: clone });
    expect(exitCode).toBe(1);
    expect(output).toMatch(/shallow clone: meta\/commit cannot be read.*git fetch --unshallow/);
  });
});
