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
import {
  readFigmaMeta,
  browsableRepoUrl,
  changelogDate,
  metaGaps,
  SYNCED_INPUTS,
} from '../lib/figma-meta.mjs';
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
    const model = buildFigmaModel(raw(), { meta: { version: '1.2.3' } });
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
    expect(r.report.meta).toEqual([
      { key: 'version', name: 'meta/version', expected: '0.2.0', actual: '0.2.0', ok: true },
    ]);
  });

  it('fails and names the two versions when package.json moved on', async () => {
    const dir = await rootAt('0.3.0', { pushVersion: '0.2.0' });
    const r = runDriftCheck({ root: dir });
    expect(r.exitCode).toBe(1);
    expect(r.report.meta).toEqual([
      { key: 'version', name: 'meta/version', expected: '0.3.0', actual: '0.2.0', ok: false },
    ]);
    expect(r.output).toMatch(/meta\/version: Figma shows 0\.2\.0, code is 0\.3\.0/);
  });

  it('reports a Figma file with no meta/version as missing', async () => {
    const model = buildFigmaModel(raw(), { meta: { version: '0.2.0' } });
    const bare = buildFigmaModel(raw());
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(bare);
    await hdsRunPush(figma, payload, checksum);
    const file = parseSnapshotFile(serializeSnapshotFile(await hdsRunSnapshot(figma)));
    const report = figmaDrift(model, file);
    expect(report.meta).toEqual([
      { key: 'version', name: 'meta/version', expected: '0.2.0', actual: null, ok: false },
    ]);
    expect(formatDrift(report)).toMatch(/meta\/version: Figma has none, code is 0\.2\.0/);
  });
});

const PKG = {
  name: '@hirobius/design-system',
  version: '0.32.0',
  homepage: 'https://github.com/hirobius/hds#readme',
  repository: { type: 'git', url: 'git+https://github.com/hirobius/hds.git' },
};
const SHA = 'abcdef0123456789abcdef0123456789abcdef01';

/** A root holding package.json (and, optionally, a release ledger or changelog). */
function pkgRoot({ pkg = PKG, ledger, changelog } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'figma-meta-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg));
  if (ledger) {
    mkdirSync(join(dir, 'upgrade', 'releases'), { recursive: true });
    writeFileSync(join(dir, 'upgrade', 'releases', `${pkg.version}.json`), JSON.stringify(ledger));
  }
  if (changelog) writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
  return dir;
}

/** A fake git: `log -1 --format=%H` gives SHA, `-S` (the version commit) gives `versionDate`. */
const fakeGit =
  ({ sha = SHA, versionDate = '2026-01-02', calls = [] } = {}) =>
  (root, args) => {
    calls.push(args);
    if (args.includes('-S')) return versionDate ? `${versionDate}\n2026-12-31` : null;
    if (args.includes('--format=%H')) return sha;
    return null;
  };

describe('readFigmaMeta: every value from the repo, none from the clock', () => {
  it('meta/npmName, meta/docsUrl and meta/repoUrl come from package.json', () => {
    const meta = readFigmaMeta(pkgRoot(), { git: fakeGit() });
    expect(meta.npmName).toBe('@hirobius/design-system');
    expect(meta.docsUrl).toBe('https://github.com/hirobius/hds#readme');
    expect(meta.repoUrl).toBe('https://github.com/hirobius/hds');
    expect(meta.version).toBe('0.32.0');
  });

  it('repoUrl reads every repository shape npm allows as a browsable URL', () => {
    expect(browsableRepoUrl('git+https://github.com/o/r.git')).toBe('https://github.com/o/r');
    expect(browsableRepoUrl('git@github.com:o/r.git')).toBe('https://github.com/o/r'); // pii-allow
    expect(browsableRepoUrl({ url: 'git://github.com/o/r.git' })).toBe('https://github.com/o/r');
    expect(browsableRepoUrl('github:o/r')).toBeNull();
    expect(browsableRepoUrl(undefined)).toBeNull();
  });

  it('meta/commit is the 7-character SHA of the last commit to the synced inputs', () => {
    const calls = [];
    const meta = readFigmaMeta(pkgRoot(), { git: fakeGit({ calls }) });
    expect(meta.commit).toBe('abcdef0');
    const shaCall = calls.find((a) => a.includes('--format=%H'));
    expect(shaCall.slice(shaCall.indexOf('--') + 1)).toEqual([...SYNCED_INPUTS]);
  });

  it('meta/releasedAt prefers the upgrade/releases ledger', () => {
    const dir = pkgRoot({
      ledger: { version: '0.32.0', date: '2026-10-24' },
      changelog: '## 0.32.0 (2026-09-09)\n',
    });
    expect(readFigmaMeta(dir, { git: fakeGit() }).releasedAt).toBe('2026-10-24');
  });

  it('meta/releasedAt falls back to the CHANGELOG heading date', () => {
    const dir = pkgRoot({ changelog: '# Changelog\n\n## [0.32.0] - 2026-09-09\n\n## 0.31.0\n' });
    expect(readFigmaMeta(dir, { git: fakeGit() }).releasedAt).toBe('2026-09-09');
    expect(changelogDate('## 0.32.0\n', '0.32.0')).toBeNull();
    expect(changelogDate('## 0.32.01 (2026-01-01)\n', '0.32.0')).toBeNull();
  });

  it('meta/releasedAt falls back to the date of the commit that set the version', () => {
    const calls = [];
    const meta = readFigmaMeta(pkgRoot({ changelog: '## 0.32.0\n' }), {
      git: fakeGit({ calls }),
    });
    expect(meta.releasedAt).toBe('2026-01-02');
    expect(calls.find((a) => a.includes('-S'))).toContain('"version": "0.32.0"');
  });

  it('is deterministic: two reads of the same repo agree', () => {
    const dir = pkgRoot({ ledger: { date: '2026-10-24' } });
    expect(readFigmaMeta(dir, { git: fakeGit() })).toEqual(readFigmaMeta(dir, { git: fakeGit() }));
  });

  it('leaves out what it cannot read: no git, no package.json', () => {
    const meta = readFigmaMeta(pkgRoot({ pkg: { name: 'x' } }), { git: () => null });
    expect(meta).toEqual({ npmName: 'x' });
    expect(readFigmaMeta(mkdtempSync(join(tmpdir(), 'figma-meta-')))).toEqual({});
  });

  it('carries no component or token counts', () => {
    const model = buildFigmaModel(raw(), { meta: readFigmaMeta(pkgRoot(), { git: fakeGit() }) });
    const names = model.collections.find((c) => c.key === 'meta').variables.map((v) => v.name);
    expect(names).toEqual([
      'meta/version',
      'meta/releasedAt',
      'meta/commit',
      'meta/docsUrl',
      'meta/repoUrl',
      'meta/npmName',
    ]);
    expect(validateFigmaModel(model)).toEqual([]);
  });

  it('the repo itself reads all six', () => {
    const root = join(import.meta.dirname, '..', '..');
    const meta = readFigmaMeta(root);
    expect(Object.keys(meta).sort()).toEqual([
      'commit',
      'docsUrl',
      'npmName',
      'releasedAt',
      'repoUrl',
      'version',
    ]);
    expect(meta.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(meta.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('drift names each meta value that differs', () => {
  const ALL = {
    version: '0.32.0',
    releasedAt: '2026-10-24',
    commit: 'abcdef0',
    docsUrl: 'https://github.com/hirobius/hds#readme',
    repoUrl: 'https://github.com/hirobius/hds',
    npmName: '@hirobius/design-system',
  };

  async function snapshotOf(meta) {
    const figma = newFixtureFile();
    const { payload, checksum } = buildPushPayload(buildFigmaModel(raw(), { meta }));
    await hdsRunPush(figma, payload, checksum);
    return parseSnapshotFile(serializeSnapshotFile(await hdsRunSnapshot(figma)));
  }

  it('reports nothing when Figma holds every value', async () => {
    const report = figmaDrift(buildFigmaModel(raw(), { meta: ALL }), await snapshotOf(ALL));
    expect(report.ok).toBe(true);
    expect(report.meta.every((g) => g.ok)).toBe(true);
    expect(report.meta).toHaveLength(6);
  });

  for (const key of ['releasedAt', 'commit', 'docsUrl', 'repoUrl', 'npmName']) {
    it(`fails on meta/${key} alone`, async () => {
      const stale = { ...ALL, [key]: `old-${key}` };
      const report = figmaDrift(buildFigmaModel(raw(), { meta: ALL }), await snapshotOf(stale));
      expect(report.ok).toBe(false);
      expect(report.meta.filter((g) => !g.ok).map((g) => g.name)).toEqual([`meta/${key}`]);
      expect(formatDrift(report)).toContain(
        `meta/${key}: Figma shows old-${key}, code is ${ALL[key]}`,
      );
    });
  }

  it('metaGaps matches a hand-made variable by name, as a push would', () => {
    const snapshot = {
      collections: [
        {
          name: 'Hirobius/Meta',
          variables: [{ name: 'meta/commit', valuesByMode: { Default: { value: 'abcdef0' } } }],
        },
      ],
    };
    expect(metaGaps({ commit: 'abcdef0' }, snapshot)).toEqual([
      { key: 'commit', name: 'meta/commit', expected: 'abcdef0', actual: 'abcdef0', ok: true },
    ]);
  });
});
