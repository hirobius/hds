/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * meta/version: the library cover's package version, owned by code. The Figma
 * model carries a Hirobius/Meta collection whose one STRING variable,
 * meta/version, is package.json's "version" at build time; check:figma-drift
 * names it when Figma's value differs.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildFigmaModel,
  META_COLLECTION,
  META_VERSION_PATH,
  metaVersionOf,
} from '../lib/figma-model.mjs';
import { validateFigmaModel } from '../lib/figma-model-invariants.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { figmaDrift, formatDrift } from '../lib/figma-drift.mjs';
import { runDriftCheck } from '../check-figma-drift.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import {
  serializeSnapshotFile,
  parseSnapshotFile,
  tokensFileHash,
} from '../lib/figma-snapshot.mjs';
import { newFixtureFile, FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';

const raw = () => JSON.parse(readFileSync(FIXTURE_TOKENS_PATH, 'utf8'));

async function rootAt(version, { pushVersion = version } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-meta-'));
  cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
  mkdirSync(join(dir, 'figma'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: pushVersion }));
  const { model } = loadFigmaInputs(dir);
  const figma = newFixtureFile();
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  const taken = await hdsRunSnapshot(figma);
  writeFileSync(
    join(dir, 'figma', 'snapshot.json'),
    serializeSnapshotFile({ ...taken, tokensHash: tokensFileHash(dir) }),
  );
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
  return dir;
}

describe('the model carries meta/version', () => {
  it('adds Hirobius/Meta with one STRING variable holding the version', () => {
    const model = buildFigmaModel(raw(), { version: '1.2.3' });
    const meta = model.collections.find((c) => c.key === META_COLLECTION.key);
    expect(meta.name).toBe('Hirobius/Meta');
    expect(meta.modes).toEqual(['Default']);
    expect(meta.variables).toHaveLength(1);
    const [v] = meta.variables;
    expect(v).toMatchObject({
      path: META_VERSION_PATH,
      name: 'meta/version',
      resolvedType: 'STRING',
      scopes: ['TEXT_CONTENT'],
      valuesByMode: { Default: { value: '1.2.3' } },
    });
    expect(metaVersionOf(model)).toBe('1.2.3');
    expect(validateFigmaModel(model)).toEqual([]);
  });

  it('has no Meta collection without a version', () => {
    const model = buildFigmaModel(raw());
    expect(model.collections.some((c) => c.key === META_COLLECTION.key)).toBe(false);
    expect(metaVersionOf(model)).toBeNull();
  });

  it('loadFigmaInputs reads the version from package.json, never by hand', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figma-meta-'));
    cpSync(FIXTURE_TOKENS_PATH, join(dir, 'hirobius.tokens.json'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version: '9.8.7' }));
    expect(metaVersionOf(loadFigmaInputs(dir).model)).toBe('9.8.7');
  });

  it('the repo model holds the version in the repo package.json', () => {
    const root = join(import.meta.dirname, '..', '..');
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(metaVersionOf(loadFigmaInputs(root).model)).toBe(version);
  });
});

describe('check:figma-drift names meta/version drift', () => {
  it('reports no drift when Figma holds the package version', async () => {
    const dir = await rootAt('0.2.0');
    const r = runDriftCheck({ root: dir });
    expect(r.exitCode).toBe(0);
    expect(r.report.metaVersion).toEqual({ expected: '0.2.0', actual: '0.2.0', ok: true });
  });

  it('fails and names the two versions when package.json moved on', async () => {
    const dir = await rootAt('0.3.0', { pushVersion: '0.2.0' });
    const r = runDriftCheck({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.report.metaVersion).toEqual({ expected: '0.3.0', actual: '0.2.0', ok: false });
    expect(r.output).toMatch(/meta\/version: Figma shows 0\.2\.0, package\.json is 0\.3\.0/);
  });

  it('reports a Figma file with no meta/version as missing', async () => {
    const model = buildFigmaModel(raw(), { version: '0.2.0' });
    const bare = buildFigmaModel(raw());
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(bare);
    await hdsRunPush(figma, payload, checksum);
    const file = parseSnapshotFile(serializeSnapshotFile(await hdsRunSnapshot(figma)));
    const report = figmaDrift(model, file);
    expect(report.metaVersion).toEqual({ expected: '0.2.0', actual: null, ok: false });
    expect(formatDrift(report)).toMatch(/meta\/version: Figma has none, package\.json is 0\.2\.0/);
  });
});
