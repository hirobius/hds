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
  runMetaGate,
  metaReleaseGaps,
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
async function root({
  pushed = true,
  hash = 'current',
  components = LINKED,
  dropToken = false,
} = {}) {
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
  if (dropToken) {
    // Code deleted a token Figma still holds: one `extra`, which only a prune clears.
    const tokens = JSON.parse(readFileSync(join(dir, 'hirobius.tokens.json'), 'utf8'));
    delete tokens.component.button.height;
    writeFileSync(join(dir, 'hirobius.tokens.json'), JSON.stringify(tokens, null, 2));
  }
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

function writeBaseline(dir, accepted) {
  writeFileSync(
    join(dir, 'figma', 'release-drift-baseline.json'),
    JSON.stringify({ accepted }, null, 2),
  );
}

describe('drift baseline (extras only Adrian can prune)', () => {
  it('fails on an unbaselined extra and names the baseline route', async () => {
    const r = runReleaseGate({ root: await root({ dropToken: true }) });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/1 drift item/);
  });

  it('passes when every drift item is an extra in the baseline', async () => {
    const dir = await root({ dropToken: true });
    const extra = runReleaseGate({ root: dir }).output.match(/extra\s+(\S+)/)[1];
    writeBaseline(dir, [{ kind: 'extra', name: extra, reason: 'awaiting prune' }]);
    const r = runReleaseGate({ root: dir });
    expect(r.output).toMatch(/baselined/);
    expect(r.exitCode).toBe(0);
  });

  it('fails on a stale baseline entry that is no longer drift', async () => {
    const dir = await root();
    writeBaseline(dir, [{ kind: 'extra', name: 'space/gone', reason: 'pruned' }]);
    const r = runReleaseGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/stale.*space\/gone/);
  });

  it('refuses to baseline anything but an extra', async () => {
    const dir = await root({ pushed: false });
    writeBaseline(dir, [{ kind: 'missing', name: 'space/2', reason: 'later' }]);
    const r = runReleaseGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/only `extra` items can be baselined/);
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
    const only = runMetaGate({ root: dir });
    expect(only.exitCode).toBe(0);
    expect(only.output).toMatch(/Hirobius\/Meta matches code \(meta\/version 1\.0\.0\)/);
  });

  it('fails the gate on a mismatch, with a reminder and the snapshot-diff route', async () => {
    const dir = await versioned('1.1.0', '1.0.0');
    expect(metaVersionGap(dir)).toEqual({ expected: '1.1.0', actual: '1.0.0', ok: false });
    for (const r of [runReleaseGate({ root: dir }), runMetaGate({ root: dir })]) {
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
    const r = runMetaGate({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/no meta\/version in Figma/);
  });
});

describe('meta gate covers every Hirobius/Meta value', () => {
  const noGit = { git: () => null };
  it('fails on a stale meta/npmName even when meta/version matches', async () => {
    const dir = await root();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'a', version: '1.0.0' }));
    const { model } = loadFigmaInputs(dir);
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(model);
    await hdsRunPush(figma, payload, checksum);
    writeFileSync(
      join(dir, 'figma', 'snapshot.json'),
      serializeSnapshotFile({ ...(await hdsRunSnapshot(figma)), tokensHash: tokensFileHash(dir) }),
    );
    expect(runMetaGate({ root: dir, ...noGit }).exitCode).toBe(0);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'b', version: '1.0.0' }));
    const gaps = metaReleaseGaps(dir, noGit);
    expect(gaps.filter((g) => !g.ok).map((g) => g.name)).toEqual(['meta/npmName']);
    const r = runMetaGate({ root: dir, ...noGit });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/meta\/npmName is a in Figma but code says b/);
    expect(runReleaseGate({ root: dir, ...noGit }).exitCode).toBe(1);
  });

  it('fails when meta/commit moved on (a synced input changed after the push)', async () => {
    const dir = await root();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    const at = (sha) => ({ git: (_r, args) => (args.includes('--format=%H') ? sha : null) });
    const { readFigmaMeta } = await import('../lib/figma-meta.mjs');
    const { buildFigmaModel } = await import('../lib/figma-model.mjs');
    const { readFileSync: read } = await import('fs');
    const tokens = JSON.parse(read(join(dir, 'hirobius.tokens.json'), 'utf8'));
    const model = buildFigmaModel(tokens, { meta: readFigmaMeta(dir, at('1111111aaaa')) });
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(model);
    await hdsRunPush(figma, payload, checksum);
    writeFileSync(
      join(dir, 'figma', 'snapshot.json'),
      serializeSnapshotFile({ ...(await hdsRunSnapshot(figma)), tokensHash: tokensFileHash(dir) }),
    );
    expect(runMetaGate({ root: dir, ...at('1111111aaaa') }).exitCode).toBe(0);
    const r = runMetaGate({ root: dir, ...at('2222222bbbb') });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/meta\/commit is 1111111 in Figma but code says 2222222/);
  });
});

describe('a squash merge of a Version PR synced before the merge', () => {
  // The ops agent pushes Figma and ingests the snapshot on the Version PR head
  // (sha 1111111…). The squash merge lands the same tree under a new sha
  // (2222222…), so meta/commit cannot equal HEAD's; the synced-input content can.
  const at = (sha) => ({ git: (_r, args) => (args.includes('--format=%H') ? sha : null) });
  const HEAD_OF_PR = at('1111111aaaa');
  const SQUASH = at('2222222bbbb');

  /** A root whose Figma was pushed and ingested at the Version PR head, version 1.0.0. */
  async function syncedOnPrHead() {
    const dir = await root();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'a', version: '1.0.0' }));
    const { buildFigmaModel } = await import('../lib/figma-model.mjs');
    const { readFigmaMeta } = await import('../lib/figma-meta.mjs');
    const tokens = JSON.parse(readFileSync(join(dir, 'hirobius.tokens.json'), 'utf8'));
    const model = buildFigmaModel(tokens, { meta: readFigmaMeta(dir, HEAD_OF_PR) });
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(model);
    await hdsRunPush(figma, payload, checksum);
    ingestSnapshot({ root: dir, text: serializeSnapshotFile(await hdsRunSnapshot(figma)) });
    return dir;
  }

  it('ingest records the synced-input content hash', async () => {
    const dir = await syncedOnPrHead();
    const { syncedInputsHash } = await import('../lib/figma-meta.mjs');
    const file = parseSnapshotFile(readFileSync(join(dir, 'figma', 'snapshot.json'), 'utf8'));
    expect(file.syncedHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(file.syncedHash).toBe(syncedInputsHash(dir));
  });

  it('passes on the squash sha when the synced content is the same', async () => {
    const dir = await syncedOnPrHead();
    expect(runReleaseGate({ root: dir, ...HEAD_OF_PR }).exitCode).toBe(0);
    const squash = runReleaseGate({ root: dir, ...SQUASH });
    expect(squash.output).not.toMatch(/meta\/commit/);
    expect(squash.exitCode).toBe(0);
    expect(runMetaGate({ root: dir, ...SQUASH }).exitCode).toBe(0);
  });

  it('fails when a synced input changed after the ingest', async () => {
    const dir = await syncedOnPrHead();
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'a', version: '1.0.0', description: 'changed after the push' }),
    );
    for (const r of [
      runReleaseGate({ root: dir, ...SQUASH }),
      runMetaGate({ root: dir, ...SQUASH }),
    ]) {
      expect(r.exitCode).toBe(1);
      expect(r.output).toMatch(/meta\/commit is 1111111 in Figma but code says 2222222/);
    }
  });

  it('fails when the version is not the one Figma shows', async () => {
    const dir = await syncedOnPrHead();
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'a', version: '1.0.1' }));
    const r = runReleaseGate({ root: dir, ...SQUASH });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/meta\/version is 1\.0\.0 in Figma but this release is 1\.0\.1/);
  });
});
