/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The release gate (`pnpm check:figma-release`, hds#801): publishing waits for
 * Figma. Seam: runReleaseGate({ root, tokensChangedSince }) in
 * scripts/check-figma-release.mjs, with git injected so no repo is needed.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runReleaseGate } from '../check-figma-release.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { newFixtureFile, FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';

const unchanged = () => ({ known: true, changed: false });

/** A mini-root holding the fixture tokens and a snapshot of Figma pushed from them. */
async function root({ pushed = true, commit = 'abc1234' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-release-'));
  cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
  mkdirSync(join(dir, 'figma'));
  const { model } = loadFigmaInputs(dir);
  const figma = newFixtureFile();
  if (pushed) {
    const { payload, checksum } = buildPushPayload(model);
    await hdsRunPush(figma, payload, checksum);
  }
  const taken = await hdsRunSnapshot(figma);
  writeFileSync(
    join(dir, 'figma', 'snapshot.json'),
    serializeSnapshotFile({ ...taken, matchesCommit: commit }),
  );
  return dir;
}

describe('runReleaseGate', () => {
  it('passes when Figma matches the model and the tokens are unchanged since the snapshot commit', async () => {
    const r = runReleaseGate({ root: await root(), tokensChangedSince: unchanged });
    expect(r.exitCode).toBe(0);
  });

  it('fails on drift, names the count and the fix', async () => {
    const r = runReleaseGate({
      root: await root({ pushed: false }),
      tokensChangedSince: unchanged,
    });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/Figma is behind code/);
    expect(r.output).toMatch(/\d+ drift item/);
    expect(r.output).toMatch(/delta\.js.*use_figma.*pnpm figma:snapshot --ingest/s);
  });

  it('fails when hirobius.tokens.json changed after the snapshot commit', async () => {
    const dir = await root({ commit: 'abc1234' });
    const seen = [];
    const r = runReleaseGate({
      root: dir,
      tokensChangedSince: (commit) => (seen.push(commit), { known: true, changed: true }),
    });
    expect(seen).toEqual(['abc1234']);
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/hirobius\.tokens\.json changed after abc1234/);
    expect(r.output).toMatch(/pnpm figma:snapshot --ingest/);
  });

  it('fails when the snapshot records no commit', async () => {
    const r = runReleaseGate({ root: await root({ commit: null }), tokensChangedSince: unchanged });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/matchesCommit/);
  });

  it('fails when the snapshot commit is not in this checkout', async () => {
    const r = runReleaseGate({
      root: await root(),
      tokensChangedSince: () => ({ known: false, changed: false }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/not in this checkout/);
  });

  it('fails when there is no snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-release-'));
    const r = runReleaseGate({ root: dir, tokensChangedSince: unchanged });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/Figma is behind code/);
  });
});

describe('ingest records matchesCommit', () => {
  it('writes the commit and keeps it through a parse round trip', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-ingest-'));
    const text = serializeSnapshotFile(await hdsRunSnapshot(newFixtureFile()));
    ingestSnapshot({ root: dir, text, commit: 'deadbeef' });
    const written = readFileSync(join(dir, 'figma', 'snapshot.json'), 'utf8');
    expect(parseSnapshotFile(written).matchesCommit).toBe('deadbeef');
  });
});
