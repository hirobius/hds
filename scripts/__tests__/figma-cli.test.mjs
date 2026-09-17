/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The Figma sync commands end to end on disk: `pnpm figma:push`,
 * `pnpm figma:snapshot`, `pnpm check:figma-drift`, `pnpm figma:native-import`.
 *
 * Seams: the exported command functions (writePushArtifacts, ingestSnapshot,
 * runDriftCheck, tokensChangedAt, writeNativeImport) against a temporary repo
 * root, plus the drift gate's CLI exit codes in fixture mode. Tests that spawn
 * git or node strip every GIT_* variable, so a hook-exported GIT_DIR can never
 * point them at a real repository.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
  rmSync,
  utimesSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import { planAgainstSnapshot, writePushArtifacts } from '../figma-push.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import { runDriftCheck, tokensChangedAt } from '../check-figma-drift.mjs';
import { writeNativeImport } from '../build-figma-native-import.mjs';
import { buildFigmaModel } from '../lib/figma-model.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { FIXTURE_TOKENS_PATH, newFixtureFile } from './helpers/figma-fixture.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cleanEnv = () =>
  Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-figma-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
  return root;
};
const takeSnapshot = async (root, edit = async () => {}) => {
  const model = buildFigmaModel(
    JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8')),
  );
  const figma = newFixtureFile();
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  await edit(figma);
  return serializeSnapshotFile(await hdsRunSnapshot(figma));
};

describe('pnpm figma:push', () => {
  it('writes the development plugin, one use_figma script per chunk, and the snapshot script', () => {
    const root = tempRoot();
    const outDir = join(root, 'figma', 'push');
    const result = writePushArtifacts({ root, outDir });

    expect(readdirSync(join(outDir, 'plugin')).sort()).toEqual([
      'code.js',
      'manifest.json',
      'ui.html',
    ]);
    expect(readdirSync(join(outDir, 'use-figma')).sort()).toEqual([
      '01-primitive.js',
      '02-semantic.js',
      '03-component.js',
      '04-role.js',
      '05-styles.js',
      'snapshot.js',
    ]);
    expect(result.prune).toBe(false);
    expect(readFileSync(join(outDir, 'use-figma', '02-semantic.js'), 'utf8')).toContain(
      'return await hdsRunPush(figma, PAYLOAD, CHECKSUM);',
    );
  });

  it('bakes TOKEN_MIGRATION.md renames into the payload', () => {
    const root = tempRoot();
    writeFileSync(
      join(root, 'TOKEN_MIGRATION.md'),
      'semantic.typography.caption -> semantic.typography.eyebrow (renamed 2026-05-04)\n',
    );
    const outDir = join(root, 'figma', 'push');
    writePushArtifacts({ root, outDir });
    expect(readFileSync(join(outDir, 'plugin', 'code.js'), 'utf8')).toContain(
      '"renames":{"semantic.typography.caption":"semantic.typography.eyebrow"}',
    );
  });

  it('refuses to write carriers for a model that fails its invariants', () => {
    const root = tempRoot();
    writeFileSync(
      join(root, 'hirobius.tokens.json'),
      JSON.stringify({ semantic: { misc: { $type: 'number', weird: { $value: 3 } } } }),
    );
    const outDir = join(root, 'figma', 'push');
    expect(() => writePushArtifacts({ root, outDir })).toThrow(/invariant violation/);
    expect(existsSync(outDir)).toBe(false);
  });

  it('--plan: previews a push against the committed snapshot, without Figma', async () => {
    const root = tempRoot();
    const snapshotFile = parseSnapshotFile(
      await takeSnapshot(root, async (figma) => {
        (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === 'ring').remove();
      }),
    );
    const { model, renames } = writePushArtifacts({ root, outDir: join(root, 'figma', 'push') });
    const { line, changes } = planAgainstSnapshot({ model, renames, snapshotFile });
    expect(line).toBe('updated 0 · created 1 · deleted 0');
    expect(changes).toEqual(['create variable role.ring']);
  });
});

describe('pnpm figma:snapshot --ingest', () => {
  it('verifies the checksum and writes figma/snapshot.json', async () => {
    const root = tempRoot();
    const downloaded = join(root, 'figma-snapshot.json');
    writeFileSync(downloaded, await takeSnapshot(root));

    const { snapshot, outPath } = ingestSnapshot({ root, from: downloaded });
    expect(outPath).toBe(join(root, 'figma', 'snapshot.json'));
    expect(JSON.parse(readFileSync(outPath, 'utf8')).snapshot.file.name).toBe('HDS scratch file');
    expect(snapshot.collections).toHaveLength(4);
  });

  it('writes nothing when the file was altered', async () => {
    const root = tempRoot();
    const downloaded = join(root, 'figma-snapshot.json');
    writeFileSync(
      downloaded,
      (await takeSnapshot(root)).replace('"Hirobius/Role"', '"Hirobius/Rôle"'),
    );
    expect(() => ingestSnapshot({ root, from: downloaded })).toThrow(/checksum/);
    expect(existsSync(join(root, 'figma', 'snapshot.json'))).toBe(false);
  });
});

describe('pnpm check:figma-drift', () => {
  const writeSnapshot = (root, text) => {
    mkdirSync(join(root, 'figma'), { recursive: true });
    writeFileSync(join(root, 'figma', 'snapshot.json'), text);
  };

  it('exits 2 with the next step when no snapshot has been taken', () => {
    const { exitCode, output } = runDriftCheck({ root: tempRoot(), tokensChangedAt: null });
    expect(exitCode).toBe(2);
    expect(output).toMatch(/No Figma snapshot yet.*pnpm figma:snapshot/s);
  });

  it('exits 0 when Figma matches the model and 1 when it drifted', async () => {
    const root = tempRoot();
    writeSnapshot(root, await takeSnapshot(root));
    expect(runDriftCheck({ root, tokensChangedAt: null })).toMatchObject({ exitCode: 0 });

    writeSnapshot(
      root,
      await takeSnapshot(root, async (figma) => {
        const variable = (await figma.variables.getLocalVariablesAsync()).find(
          (v) => v.name === 'radius/8',
        );
        const primitives = (await figma.variables.getLocalVariableCollectionsAsync())[0];
        variable.setValueForMode(primitives.defaultModeId, 6);
      }),
    );
    const drifted = runDriftCheck({ root, tokensChangedAt: null });
    expect(drifted.exitCode).toBe(1);
    expect(drifted.output).toContain('changed  radius/8 [Default]: model 8, Figma 6');
  });

  it('exits 1 on a hand-edited snapshot', async () => {
    const root = tempRoot();
    writeSnapshot(root, (await takeSnapshot(root)).replace('"radius/8"', '"radius/eight"'));
    const { exitCode, output } = runDriftCheck({ root, tokensChangedAt: null });
    expect(exitCode).toBe(1);
    expect(output).toMatch(/edited after it was taken/);
  });

  describe('--ci', () => {
    const driftedSnapshot = (root) =>
      takeSnapshot(root, async (figma) => {
        (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === 'ring').remove();
      });

    it('passes with a notice while no snapshot has been committed', () => {
      const { exitCode, output } = runDriftCheck({
        root: tempRoot(),
        tokensChangedAt: null,
        ci: true,
      });
      expect(exitCode).toBe(0);
      expect(output).toMatch(/^::notice title=Figma drift::No Figma snapshot yet/);
    });

    it('warns without failing when the snapshot is older than the tokens (a push is pending)', async () => {
      const root = tempRoot();
      writeSnapshot(root, await driftedSnapshot(root));
      const later = new Date(Date.now() + 60_000).toISOString();
      const { exitCode, output } = runDriftCheck({ root, tokensChangedAt: later, ci: true });
      expect(exitCode).toBe(0);
      expect(output).toContain('missing  ring (role.ring)');
      expect(output).toMatch(
        /::warning title=Figma drift::1 drift item\(s\) against a snapshot older than hirobius\.tokens\.json/,
      );
    });

    it('fails when a snapshot newer than the tokens disagrees with them', async () => {
      const root = tempRoot();
      writeSnapshot(root, await driftedSnapshot(root));
      const earlier = '2020-01-01T00:00:00.000Z';
      const { exitCode, output } = runDriftCheck({ root, tokensChangedAt: earlier, ci: true });
      expect(exitCode).toBe(1);
      expect(output).toMatch(/::error title=Figma drift::1 drift item\(s\)/);
    });
  });

  it('prints JSON with --json', async () => {
    const root = tempRoot();
    writeSnapshot(root, await takeSnapshot(root));
    const { output } = runDriftCheck({ root, tokensChangedAt: null, json: true });
    expect(JSON.parse(output)).toMatchObject({
      ok: true,
      counts: { missing: 0, extra: 0, changed: 0 },
    });
  });

  it('fires on its registry fixtures: violating exits non-zero, passing exits zero', () => {
    const run = (name) =>
      spawnSync(
        process.execPath,
        [join(REPO, 'scripts', 'check-figma-drift.mjs'), '--fixture-mode'],
        {
          env: {
            ...cleanEnv(),
            HDS_FIXTURE_MODE: '1',
            FIXTURE_DIR: join(REPO, 'fixtures', 'check-figma-drift', name),
          },
          encoding: 'utf8',
        },
      );
    const violating = run('violating.example.d');
    expect(violating.status, violating.stdout + violating.stderr).toBe(1);
    const passing = run('passing.example.d');
    expect(passing.status, passing.stdout + passing.stderr).toBe(0);
  });
});

describe('tokensChangedAt', () => {
  const git = (cwd, args, extraEnv = {}) =>
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
      cwd,
      env: { ...cleanEnv(), ...extraEnv },
      stdio: 'pipe',
    });

  it('is the last commit that touched hirobius.tokens.json, or the file time when it has uncommitted edits', () => {
    const root = tempRoot();
    git(root, ['init', '-q']);
    git(root, ['add', 'hirobius.tokens.json']);
    git(root, ['commit', '-q', '-m', 'tokens'], {
      GIT_COMMITTER_DATE: '2026-09-01T10:00:00Z',
      GIT_AUTHOR_DATE: '2026-09-01T10:00:00Z',
    });
    expect(tokensChangedAt(root)).toBe('2026-09-01T10:00:00.000Z');

    const tokens = join(root, 'hirobius.tokens.json');
    writeFileSync(tokens, `${readFileSync(tokens, 'utf8')}\n`);
    const edited = new Date('2026-09-02T12:00:00Z');
    utimesSync(tokens, edited, edited);
    expect(tokensChangedAt(root)).toBe('2026-09-02T12:00:00.000Z');
  });
});

describe('pnpm figma:native-import', () => {
  it('writes one DTCG file per collection × mode', () => {
    const root = tempRoot();
    const outDir = join(root, 'figma', 'native-import');
    const { files } = writeNativeImport({ root, outDir });
    expect(files.map((f) => f.path)).toEqual([
      '01-primitive/Default.json',
      '02-semantic/Light.json',
      '02-semantic/Dark.json',
      '03-component/Default.json',
      '04-role/Default.json',
    ]);
    const dark = JSON.parse(readFileSync(join(outDir, '02-semantic', 'Dark.json'), 'utf8'));
    expect(dark.color.surface.page.$extensions['com.figma.aliasData'].targetVariableName).toBe(
      'color/neutral/black',
    );
  });

  it('builds from the real hirobius.tokens.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'hds-figma-real-'));
    dirs.push(root);
    copyFileSync(join(REPO, 'hirobius.tokens.json'), join(root, 'hirobius.tokens.json'));
    const { files } = writeNativeImport({ root, outDir: join(root, 'out') });
    expect(files).toHaveLength(5);
  });
});
