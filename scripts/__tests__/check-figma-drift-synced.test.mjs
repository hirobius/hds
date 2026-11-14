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
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runDriftCheck } from '../check-figma-drift.mjs';
import { serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { syncedInputsHash } from '../lib/figma-meta.mjs';
import { FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';
import {
  git,
  commitAll,
  squash,
  snapshotFile,
  pushAndIngest,
} from './helpers/figma-meta-fixtures.mjs';

/** A git root whose Figma was pushed from, and ingested at, its head commit. */
async function syncedOnPrHead() {
  const dir = mkdtempSync(join(tmpdir(), 'figma-drift-synced-'));
  cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
  mkdirSync(join(dir, 'figma'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'a', version: '1.0.0' }));
  git(dir, 'init', '-q');
  commitAll(dir, 'Version Packages');
  await pushAndIngest(dir);
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
