/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The release gate (`pnpm check:figma-release`, hds#801): publishing waits for
 * Figma. Seam: runReleaseGate({ root }) in scripts/check-figma-release.mjs,
 * run against a temp root holding tokens and a snapshot; no git needed.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runReleaseGate } from '../check-figma-release.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import {
  parseSnapshotFile,
  serializeSnapshotFile,
  tokensFileHash,
} from '../lib/figma-snapshot.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { newFixtureFile, FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';

/** A mini-root holding the fixture tokens and a snapshot of Figma pushed from them. */
async function root({ pushed = true, hash = 'current' } = {}) {
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
  const tokensHash = hash === 'current' ? tokensFileHash(dir) : hash;
  writeFileSync(
    join(dir, 'figma', 'snapshot.json'),
    serializeSnapshotFile({ ...taken, tokensHash }),
  );
  return dir;
}

describe('runReleaseGate', () => {
  it('passes when Figma matches the model and the tokens hash matches the snapshot', async () => {
    const r = runReleaseGate({ root: await root() });
    expect(r.exitCode).toBe(0);
  });

  it('fails on drift, names the count and the fix', async () => {
    const r = runReleaseGate({ root: await root({ pushed: false }) });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/Figma is behind code/);
    expect(r.output).toMatch(/\d+ drift item/);
    expect(r.output).toMatch(/delta\.js.*use_figma.*pnpm figma:snapshot --ingest/s);
  });

  it('fails when hirobius.tokens.json changed after the snapshot was ingested', async () => {
    const r = runReleaseGate({ root: await root({ hash: 'sha256:0000' }) });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/hirobius\.tokens\.json changed after the snapshot was ingested/);
    expect(r.output).toMatch(/delta\.js.*use_figma.*pnpm figma:snapshot --ingest/s);
  });

  it('fails on an old snapshot without tokensHash and says to re-run ingest', async () => {
    const r = runReleaseGate({ root: await root({ hash: null }) });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/no tokensHash.*re-run pnpm figma:snapshot --ingest/);
  });

  it('fails when there is no snapshot', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-release-'));
    const r = runReleaseGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/Figma is behind code/);
  });
});

describe('ingest records tokensHash', () => {
  it('writes the hash of hirobius.tokens.json and keeps it through a parse round trip', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-ingest-'));
    cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
    const text = serializeSnapshotFile(await hdsRunSnapshot(newFixtureFile()));
    ingestSnapshot({ root: dir, text });
    const written = parseSnapshotFile(readFileSync(join(dir, 'figma', 'snapshot.json'), 'utf8'));
    expect(written.tokensHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(written.tokensHash).toBe(tokensFileHash(dir));
    expect(written).not.toHaveProperty('matchesCommit');
  });
});
