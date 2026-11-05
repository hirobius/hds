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
import {
  runReleaseGate,
  componentCoverageGaps,
  metaVersionGap,
  runMetaVersionGate,
} from '../check-figma-release.mjs';
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

const NODE = 'https://www.figma.com/design/KEY/HDS?node-id=1-2';
const LINKED = [
  { name: 'Button', class: 'library', figmaUrl: NODE },
  { name: 'CardHeader', class: 'slot', figmaUrl: null },
];

function writeDisposition(dir, components, overrides = []) {
  writeFileSync(join(dir, 'figma', 'disposition.json'), JSON.stringify({ components }));
  writeFileSync(join(dir, 'figma', 'mapping-overrides.json'), JSON.stringify({ overrides }));
}

/** A mini-root holding the fixture tokens and a snapshot of Figma pushed from them. */
async function root({ pushed = true, hash = 'current', components = LINKED } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-release-'));
  cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
  mkdirSync(join(dir, 'figma'));
  writeDisposition(dir, components);
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

describe('component coverage (step 3)', () => {
  it('fails when a library component has no @figma node, naming it and the fix', async () => {
    const r = runReleaseGate({
      root: await root({
        components: [...LINKED, { name: 'Sheet', class: 'library', figmaUrl: null }],
      }),
    });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/1 library component\(s\) with no Figma node: Sheet/);
    expect(r.output).toMatch(/@figma/);
  });

  it('counts a mapping override (Card.Progress -> CardProgress) as covered', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-cov-'));
    mkdirSync(join(dir, 'figma'));
    writeDisposition(
      dir,
      [{ name: 'CardProgress', class: 'library', figmaUrl: null }],
      [{ mapsTo: 'Card.Progress' }],
    );
    expect(componentCoverageGaps(dir)).toEqual({ missing: [], table: true });
  });

  it('ignores slot, layout and internal components', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-cov-'));
    mkdirSync(join(dir, 'figma'));
    writeDisposition(dir, [
      { name: 'Box', class: 'layout', figmaUrl: null },
      { name: 'CardHeader', class: 'slot', figmaUrl: null },
    ]);
    expect(componentCoverageGaps(dir).missing).toEqual([]);
  });

  it('fails when figma/disposition.json is missing', async () => {
    const dir = await root();
    const { rmSync } = await import('fs');
    rmSync(join(dir, 'figma', 'disposition.json'));
    const r = runReleaseGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/no figma\/disposition\.json.*pnpm figma:disposition --write/);
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

describe('meta/version (the library cover)', () => {
  /** A root pushed while package.json said `pushed`, now saying `version`. */
  async function versioned(version, pushed = version) {
    const dir = mkdtempSync(join(tmpdir(), 'figma-release-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: pushed }));
    const built = await root();
    cpSync(join(built, 'figma'), join(dir, 'figma'), { recursive: true });
    cpSync(join(built, 'hirobius.tokens.json'), join(dir, 'hirobius.tokens.json'));
    const { model } = loadFigmaInputs(dir);
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(model);
    await hdsRunPush(figma, payload, checksum);
    writeFileSync(
      join(dir, 'figma', 'snapshot.json'),
      serializeSnapshotFile({ ...(await hdsRunSnapshot(figma)), tokensHash: tokensFileHash(dir) }),
    );
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
    return dir;
  }

  it('passes when Figma meta/version is the version being released', async () => {
    const dir = await versioned('1.0.0');
    expect(metaVersionGap(dir)).toEqual({ expected: '1.0.0', actual: '1.0.0', ok: true });
    expect(runReleaseGate({ root: dir }).exitCode).toBe(0);
    const only = runMetaVersionGate({ root: dir });
    expect(only.exitCode).toBe(0);
    expect(only.output).toMatch(/meta\/version 1\.0\.0/);
  });

  it('fails the gate on a mismatch, with a reminder and the snapshot-diff route', async () => {
    const dir = await versioned('1.1.0', '1.0.0');
    expect(metaVersionGap(dir)).toEqual({ expected: '1.1.0', actual: '1.0.0', ok: false });
    for (const r of [runReleaseGate({ root: dir }), runMetaVersionGate({ root: dir })]) {
      expect(r.exitCode).toBe(1);
      expect(r.output).toMatch(/meta\/version is 1\.0\.0 in Figma but this release is 1\.1\.0/);
      expect(r.output).toMatch(/Reminder/);
      expect(r.output).toMatch(/snapshot-diff\.js.*pnpm figma:snapshot --from-diff/s);
    }
  });

  it('fails when the snapshot has no meta/version', async () => {
    const dir = await root();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    expect(metaVersionGap(dir)).toEqual({ expected: '1.0.0', actual: null, ok: false });
    const r = runMetaVersionGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/no meta\/version in Figma/);
  });
});
