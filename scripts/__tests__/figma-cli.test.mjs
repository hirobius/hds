/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The Figma sync commands end to end on disk: `pnpm figma:push`,
 * `pnpm figma:snapshot`, `pnpm check:figma-drift`, `pnpm figma:native-import`.
 *
 * Seams: the exported command functions (writePushArtifacts, ingestSnapshot,
 * runDriftCheck, writeNativeImport) against a temporary repo root, plus the
 * drift gate's CLI exit codes in fixture mode. Tests that spawn node strip
 * every GIT_* variable, so a hook-exported GIT_DIR can never point a child
 * process at a real repository.
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
import { spawnSync } from 'child_process';
import { planAgainstSnapshot, writePushArtifacts } from '../figma-push.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import { runDriftCheck } from '../check-figma-drift.mjs';
import { formatNativeImportSteps, writeNativeImport } from '../build-figma-native-import.mjs';
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
/** Pushes the root's model (through `builder`, to emulate another builder) into a new file, edits it, snapshots it. */
const takeSnapshot = async (root, edit = async () => {}, builder = (model) => model) => {
  const model = builder(
    buildFigmaModel(JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'))),
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

  it('--plan: also lists what a push cannot fix, such as a wrong default mode', async () => {
    const root = tempRoot();
    const { model, renames } = writePushArtifacts({ root, outDir: join(root, 'figma', 'push') });
    const figma = newFixtureFile();
    const semantic = figma.variables.createVariableCollection('Hirobius/Semantic');
    semantic.renameMode(semantic.defaultModeId, 'Dark');
    semantic.addMode('Light');
    const snapshotFile = parseSnapshotFile(serializeSnapshotFile(await hdsRunSnapshot(figma)));

    const { warnings } = planAgainstSnapshot({ model, renames, snapshotFile });
    expect(warnings).toEqual([
      expect.stringMatching(
        /^Hirobius\/Semantic defaults to Dark, but the model's first mode is Light/,
      ),
    ]);
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
    const { exitCode, output } = runDriftCheck({ root: tempRoot() });
    expect(exitCode).toBe(2);
    expect(output).toMatch(/No Figma snapshot yet.*pnpm figma:snapshot/s);
  });

  it('exits 0 when Figma matches the model and 1 when it drifted', async () => {
    const root = tempRoot();
    writeSnapshot(root, await takeSnapshot(root));
    expect(runDriftCheck({ root })).toMatchObject({ exitCode: 0 });

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
    const drifted = runDriftCheck({ root });
    expect(drifted.exitCode).toBe(1);
    expect(drifted.output).toContain('changed  radius/8 [Default]: model 8, Figma 6');
  });

  it('exits 1 on a hand-edited snapshot', async () => {
    const root = tempRoot();
    writeSnapshot(root, (await takeSnapshot(root)).replace('"radius/8"', '"radius/eight"'));
    const { exitCode, output } = runDriftCheck({ root });
    expect(exitCode).toBe(1);
    expect(output).toMatch(/edited after it was taken/);
  });

  describe('--ci', () => {
    const driftedSnapshot = (root) =>
      takeSnapshot(root, async (figma) => {
        (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === 'ring').remove();
      });

    it('passes with a notice while no snapshot has been committed', () => {
      const { exitCode, output } = runDriftCheck({ root: tempRoot(), ci: true });
      expect(exitCode).toBe(0);
      expect(output).toMatch(/^::notice title=Figma drift::No Figma snapshot yet/);
    });

    it('warns without failing when the tokens build a model other than the one last pushed, whatever the dates', async () => {
      // A token PR whose commit (or file time) predates a snapshot committed later.
      const root = tempRoot();
      writeSnapshot(root, await takeSnapshot(root));
      const tokens = join(root, 'hirobius.tokens.json');
      writeFileSync(tokens, readFileSync(tokens, 'utf8').replace('#1E2EFD', '#1E2EFE'));
      const longAgo = new Date('2020-01-01T00:00:00Z');
      utimesSync(tokens, longAgo, longAgo);

      const { exitCode, output } = runDriftCheck({ root, ci: true });
      expect(exitCode).toBe(0);
      expect(output).toMatch(
        /::warning title=Figma drift::1 drift item\(s\), and Figma was last pushed from a different model/,
      );
    });

    it('warns without failing when only the model builder changed, not hirobius.tokens.json', async () => {
      const root = tempRoot();
      const olderBuilder = (model) => {
        const copy = JSON.parse(JSON.stringify(model));
        copy.collections[0].variables[0].description = 'What an older builder wrote.';
        return copy;
      };
      writeSnapshot(root, await takeSnapshot(root, async () => {}, olderBuilder));
      const tokens = join(root, 'hirobius.tokens.json');
      const longAgo = new Date('2020-01-01T00:00:00Z');
      utimesSync(tokens, longAgo, longAgo);

      const { exitCode, output } = runDriftCheck({ root, ci: true });
      expect(exitCode).toBe(0);
      expect(output).toMatch(/::warning title=Figma drift::1 drift item\(s\)/);
    });

    it('warns without failing when no pnpm figma:push is recorded in the Figma file', async () => {
      const root = tempRoot();
      const figma = newFixtureFile();
      figma.variables.createVariableCollection('Hirobius/Primitives');
      writeSnapshot(root, serializeSnapshotFile(await hdsRunSnapshot(figma)));

      const { exitCode, output } = runDriftCheck({ root, ci: true });
      expect(exitCode).toBe(0);
      expect(output).toMatch(/::warning title=Figma drift::.*never pushed by pnpm figma:push/);
    });

    it('fails when Figma was last pushed from this exact model and still differs', async () => {
      const root = tempRoot();
      writeSnapshot(root, await driftedSnapshot(root));
      const { exitCode, output } = runDriftCheck({ root, ci: true });
      expect(exitCode).toBe(1);
      expect(output).toMatch(
        /::error title=Figma drift::1 drift item\(s\) although Figma was last pushed from this exact model/,
      );
    });
  });

  it('prints JSON with --json', async () => {
    const root = tempRoot();
    writeSnapshot(root, await takeSnapshot(root));
    const { output } = runDriftCheck({ root, json: true });
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

  it('adds a file per Brand and Density mode when the root lists demo tenants', () => {
    const root = tempRoot();
    mkdirSync(join(root, 'figma'), { recursive: true });
    writeFileSync(
      join(root, 'figma', 'brand-modes.json'),
      JSON.stringify({ baseMode: 'Hirobius', tenants: ['sharp-demo'] }),
    );
    mkdirSync(join(root, 'tenants', 'sharp-demo'), { recursive: true });
    writeFileSync(
      join(root, 'tenants', 'sharp-demo', 'metadata.json'),
      JSON.stringify({
        slug: 'sharp-demo',
        displayName: 'Sharp Demo',
        demo: true,
        tier: 1,
        deployment: { vercelProject: null, primaryDomain: null, previewDomain: null },
        legal: { entity: null, jurisdiction: null, stripeAccountKind: null },
        status: 'scaffold',
      }),
    );
    writeFileSync(
      join(root, 'tenants', 'sharp-demo', 'tokens.json'),
      JSON.stringify({
        role: { radius: { $type: 'dimension', $value: { value: 0, unit: 'px' } } },
        semantic: {
          space: {
            $type: 'dimension',
            component: {
              gap: {
                $value: '{primitive.space.4}',
                $extensions: {
                  'com.figma.variables': { modes: { Compact: '{primitive.space.2}' } },
                },
              },
            },
          },
        },
      }),
    );
    const outDir = join(root, 'out');
    const { files } = writeNativeImport({ root, outDir });
    expect(files.map((f) => f.path)).toEqual([
      '01-primitive/Default.json',
      '02-brand/Hirobius.json',
      '02-brand/sharp-demo.json',
      '03-density/Comfortable.json',
      '03-density/Compact.json',
      '04-semantic/Light.json',
      '04-semantic/Dark.json',
      '05-component/Default.json',
      '06-role/Default.json',
    ]);
    const compact = JSON.parse(readFileSync(join(outDir, '02-brand', 'sharp-demo.json'), 'utf8'));
    expect(compact.semantic.space.component.gap.Compact.$value).toEqual({ value: 8, unit: 'px' });

    const steps = formatNativeImportSteps(files, 'out');
    expect(steps).toMatch(
      /Hirobius\/Primitives[\s\S]*Hirobius\/Brand[\s\S]*Hirobius\/Density[\s\S]*Hirobius\/Semantic/,
    );
    expect(steps).toContain(
      'out/02-brand/Hirobius.json: role/radius aliases Hirobius/Semantic radius/action, which is imported later, so it imports as a raw value. Run pnpm figma:push afterwards to restore the alias.',
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
