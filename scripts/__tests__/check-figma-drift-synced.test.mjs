/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm check:figma-drift` and a stale meta/commit (hds#1553). Seam:
 * runDriftCheck({ root }) with no `meta` option, as the CLI calls it, against a
 * git root whose Figma was synced on a Version PR head and then squash-merged.
 * Same stand-in as the release gate (syncedCommitStandIn, hds#1359): meta/commit
 * is accepted when it is the snapshot's syncedCommit and the synced inputs'
 * git content is unchanged; any real difference still fails.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runDriftCheck } from '../check-figma-drift.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { syncedInputsHash } from '../lib/figma-meta.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { newFixtureFile, FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t',
};
const git = (dir, ...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim();
const commitAll = (dir, message) => {
  git(dir, 'add', '-A', '--', 'hirobius.tokens.json', 'package.json');
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
};
/** A parentless commit with HEAD's tree: what a squash merge lands on main. */
const squash = (dir) => {
  const sha = git(dir, 'commit-tree', 'HEAD^{tree}', '-m', 'squash');
  git(dir, 'reset', '-q', '--soft', sha);
};
const snapshotFile = (dir) =>
  parseSnapshotFile(readFileSync(join(dir, 'figma', 'snapshot.json'), 'utf8'));

/** A git root whose Figma was pushed from, and ingested at, its head commit. */
async function syncedOnPrHead() {
  const dir = mkdtempSync(join(tmpdir(), 'figma-drift-synced-'));
  cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
  mkdirSync(join(dir, 'figma'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'a', version: '1.0.0' }));
  git(dir, 'init', '-q');
  commitAll(dir, 'Version Packages');
  const { model } = loadFigmaInputs(dir);
  const figma = newFixtureFile();
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  ingestSnapshot({ root: dir, text: serializeSnapshotFile(await hdsRunSnapshot(figma)) });
  return dir;
}

function changeToken(dir) {
  const tokens = JSON.parse(readFileSync(join(dir, 'hirobius.tokens.json'), 'utf8'));
  tokens.component.button.height = {
    ...tokens.component.button.height,
    $value: '{primitive.space.2}',
  };
  writeFileSync(join(dir, 'hirobius.tokens.json'), JSON.stringify(tokens, null, 2));
}

describe('check-figma-drift with a stale meta/commit', () => {
  it('is green on the Version PR head itself', async () => {
    const dir = await syncedOnPrHead();
    expect(runDriftCheck({ root: dir }).exitCode).toBe(0);
  });

  it('is green after a squash merge: meta/commit is stale but the synced content is the same', async () => {
    const dir = await syncedOnPrHead();
    squash(dir);
    const r = runDriftCheck({ root: dir });
    expect(r.output).not.toMatch(/meta\/commit/);
    expect(r.exitCode).toBe(0);
  });

  it('fails when meta/commit is stale and a token changed', async () => {
    const dir = await syncedOnPrHead();
    changeToken(dir);
    commitAll(dir, 'change a token after the sync');
    const r = runDriftCheck({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.report.items.length).toBeGreaterThan(1);
  });

  it('fails when meta/commit is stale and a token changed, even if the recorded hash is forged to match', async () => {
    const dir = await syncedOnPrHead();
    changeToken(dir);
    commitAll(dir, 'change a token after the sync');
    writeFileSync(
      join(dir, 'figma', 'snapshot.json'),
      serializeSnapshotFile({ ...snapshotFile(dir), syncedHash: syncedInputsHash(dir) }),
    );
    expect(runDriftCheck({ root: dir }).exitCode).toBe(1);
  });

  it('fails when meta/commit is stale and the synced-input hash changed', async () => {
    const dir = await syncedOnPrHead();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'a', version: '1.0.0', description: 'changed after the sync' }),
    );
    commitAll(dir, 'change a synced input after the sync');
    const r = runDriftCheck({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/commit/);
  });
});
