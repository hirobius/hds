/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The Sync plugin (figma/push/plugin/, hds#411): a development plugin that
 * carries no model. Its window fetches the sync bundle from the Storybook
 * deploy; its code checks the bundle, checks which file it is in, pushes,
 * re-plans to zero, snapshots, and stamps a receipt into the file.
 *
 * Seams: the generated plugin files run as Figma runs them, in two isolated
 * V8 contexts joined by postMessage: code.js with the Plugin API
 * (helpers/fake-figma.mjs) and nothing from Node, and ui.html's script with a
 * fake DOM and a fake `fetch`. Nothing here reaches a network or Figma.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'acorn';
import { hdsChecksum } from '../lib/figma-runtime.mjs';
import {
  buildSyncBundle,
  buildSyncPlugin,
  syncPluginBuild,
  syncRuntimeSource,
} from '../lib/figma-scripts.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { fixtureModel, newFixtureFile } from './helpers/figma-fixture.mjs';
import { runSyncPlugin, serve } from './helpers/sync-plugin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const model = fixtureModel();

const LINKS = Object.freeze({
  storybookUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  stagingFileKey: 'STAGINGKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  stagingFileName: 'HDS Tokens & Components (Copy)',
});
const BUNDLE_URL = 'https://hirobius-design-system.vercel.app/figma/sync-bundle.json';
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const PLUGIN = buildSyncPlugin(LINKS);
const BUNDLE = buildSyncBundle(model, { commit: COMMIT, pluginFiles: PLUGIN });
const NOTHING_LINE = 'updated 0 · created 0 · deleted 0';

// ── Harness ──────────────────────────────────────────────────────────────────
const copy = (value) => JSON.parse(JSON.stringify(value));
/** Runs one menu command of a Sync plugin (helpers/sync-plugin.mjs); the window serves BUNDLE unless told otherwise. */
const runPlugin = (files, command, figma, options = {}) =>
  runSyncPlugin(files, command, figma, { fetch: serve(BUNDLE), ...options });

/** An empty in-memory file named like staging, with the given key (null: Figma gives none). */
const stagingFile = (key = LINKS.stagingFileKey, name = LINKS.stagingFileName) => {
  const figma = newFixtureFile({ fileName: name });
  if (key !== null) figma.fileKey = key;
  return figma;
};
const markAsStaging = (figma, value = LINKS.stagingFileKey) =>
  figma.root.setSharedPluginData('hirobius', 'stagingFileKey', value);
const rootData = (figma, key) => figma.root.getSharedPluginData('hirobius', key);
/** A bundle edited after the build, with its checksum recomputed so only the edit is tested. */
const rebundled = (mutate) => {
  const bundle = copy(BUNDLE);
  mutate(bundle);
  bundle.checksum = hdsChecksum(JSON.stringify(bundle.payload));
  return bundle;
};

// ── The plugin carries code, never data ──────────────────────────────────────
describe('Sync plugin files', () => {
  it('carry no payload: code.js has no PAYLOAD and stays under 60,000 bytes', () => {
    expect(PLUGIN['code.js']).not.toContain('const PAYLOAD');
    expect(Buffer.byteLength(PLUGIN['code.js'])).toBeLessThanOrEqual(60000);
  });

  it('never evaluate what they fetch: no eval, Function constructor or dynamic import', () => {
    for (const name of ['code.js', 'ui.html']) {
      expect(PLUGIN[name]).not.toMatch(
        /\beval\s*\(|\bnew Function\b|\bFunction\s*\(|\bimport\s*\(/,
      );
    }
    expect(PLUGIN['ui.html']).not.toMatch(/innerHTML|<script\s+src/);
  });

  it('stamp code.js with the build the bundle names, which covers all three files', () => {
    const build = syncPluginBuild(PLUGIN);
    expect(build).toMatch(/^[0-9a-f]{8}$/);
    expect(PLUGIN['code.js']).toContain(`const PLUGIN_BUILD = '${build}';`);
    expect(BUNDLE.pluginBuild).toBe(build);
    for (const name of ['code.js', 'ui.html', 'manifest.json']) {
      const changed = { ...PLUGIN, [name]: `${PLUGIN[name]} ` };
      expect(syncPluginBuild(changed), name).not.toBe(build);
    }
  });

  it('a bundle carries its payload checksum, never a prune, and the expected plugin files', () => {
    expect(BUNDLE).toMatchObject({
      schemaVersion: 1,
      commit: COMMIT,
      modelHash: BUNDLE.payload.modelHash,
      checksum: hdsChecksum(JSON.stringify(BUNDLE.payload)),
      base: null,
    });
    expect(BUNDLE.payload.options).toMatchObject({ prune: false, scope: null, dryRun: false });
    expect(BUNDLE.pluginFiles['code.js']).toBe(hdsChecksum(PLUGIN['code.js']));
  });
});

describe('figma-sync-runtime.mjs can be copied into Figma', () => {
  const source = readFileSync(join(HERE, '..', 'lib', 'figma-sync-runtime.mjs'), 'utf8');

  it('holds only exported functions and its one import of figma-runtime.mjs, in ES2020', () => {
    const ast = parse(source, { ecmaVersion: 2020, sourceType: 'module' });
    const offenders = ast.body
      .filter((node) =>
        node.type === 'ImportDeclaration'
          ? node.source.value !== './figma-runtime.mjs'
          : node.type !== 'ExportNamedDeclaration' ||
            node.declaration?.type !== 'FunctionDeclaration',
      )
      .map((node) => source.slice(node.start, node.end).split('\n')[0]);
    expect(offenders).toEqual([]);
  });

  it('becomes a plain script without export, import or comments', () => {
    const script = syncRuntimeSource();
    expect(script).not.toMatch(/^\s*(export|import)\b/m);
    const comments = [];
    parse(script, { ecmaVersion: 2020, sourceType: 'script', onComment: comments });
    expect(comments).toEqual([]);
  });
});

// ── Sync in staging ──────────────────────────────────────────────────────────
describe('Sync in the staging file', () => {
  it('fetches the bundle uncached, pushes, re-plans to 0 · 0 · 0, snapshots and stamps a receipt', async () => {
    const figma = stagingFile();
    const synced = await runPlugin(PLUGIN, 'sync', figma);

    expect(synced.ok, synced.error).toBe(true);
    expect(synced.fetches).toEqual([{ url: BUNDLE_URL, cache: 'no-store' }]);
    expect(synced.title).toContain(COMMIT.slice(0, 7));
    expect(synced.title).toMatch(/updated 0 · created \d+ · deleted 0/);

    const plan = await runPlugin(PLUGIN, 'plan', figma);
    expect(plan.ok, plan.error).toBe(true);
    expect(plan.result.line).toBe(NOTHING_LINE);

    // Download JSON is the fallback: what it saves is a snapshot ingest accepts.
    const ingested = parseSnapshotFile(serializeSnapshotFile(synced.result));
    expect(ingested.snapshot.lastPush.modelHash).toBe(BUNDLE.modelHash);

    const receiptText = rootData(figma, 'syncReceipt');
    expect(receiptText.length).toBeLessThanOrEqual(1024);
    const receipt = JSON.parse(receiptText);
    expect(Object.keys(receipt)).toEqual([
      'v',
      'commit',
      'modelHash',
      'pluginBuild',
      'pushedAt',
      'takenAt',
      'line',
      'counts',
      'post',
      'lastPush',
      'base',
      'format',
      'pages',
      'sum',
    ]);
    expect(receipt).toMatchObject({
      v: 1,
      commit: COMMIT,
      modelHash: BUNDLE.modelHash,
      pluginBuild: BUNDLE.pluginBuild,
      pushedAt: ingested.snapshot.lastPush.pushedAt,
      takenAt: ingested.snapshot.takenAt,
      post: synced.result.checksum,
      counts: { collections: 4, modes: 5, variables: 58, textStyles: 3, effectStyles: 3 },
    });
    expect(receipt.line).toMatch(/^updated 0 · created \d+ · deleted 0$/);
  });

  it('a second Sync makes 0 writes', async () => {
    const figma = stagingFile();
    expect((await runPlugin(PLUGIN, 'sync', figma)).ok).toBe(true);
    const before = figma.writes.length;

    const again = await runPlugin(PLUGIN, 'sync', figma);
    expect(again.ok, again.error).toBe(true);
    expect(again.title).toContain(NOTHING_LINE);
    expect(figma.writes.slice(before)).toEqual([]);
  });

  it('Plan reads the bundle and writes nothing', async () => {
    const figma = stagingFile();
    const plan = await runPlugin(PLUGIN, 'plan', figma);
    expect(plan.ok, plan.error).toBe(true);
    expect(plan.result.mode).toBe('dry-run');
    expect(plan.result.summary.variables.created).toBe(58);
    expect(figma.writes).toEqual([]);
  });

  it('runs where Figma gives no file key, in a file marked as staging and named exactly like it', async () => {
    const figma = stagingFile(null);
    markAsStaging(figma);
    const synced = await runPlugin(PLUGIN, 'sync', figma);
    expect(synced.ok, synced.error).toBe(true);
  });
});

// ── Which file ───────────────────────────────────────────────────────────────
describe('file guard: Sync writes nothing outside staging', () => {
  const refused = async (figma, pattern) => {
    const start = figma.writes.length;
    const result = await runPlugin(PLUGIN, 'sync', figma);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(pattern);
    expect(result.error).toMatch(/Nothing was read or written/);
    expect(figma.writes.slice(start)).toEqual([]);
    expect(rootData(figma, 'syncReceipt')).toBe('');
    return result.error;
  };

  it('the library key', async () => {
    await refused(stagingFile(LINKS.libraryFileKey), /published library/);
  });

  it('a null key in a file named like the library', async () => {
    await refused(stagingFile(null, LINKS.libraryFileName), /library/);
  });

  it('a null key with no staging marker, naming Mark and the key to paste', async () => {
    const error = await refused(stagingFile(null), /no file key/);
    expect(error).toContain('Mark this file as HDS staging');
    expect(error).toContain(LINKS.stagingFileKey);
  });

  it('a marker in a file not named exactly like staging (a duplicate of staging)', async () => {
    const figma = stagingFile(null, `${LINKS.stagingFileName} (Copy)`);
    markAsStaging(figma);
    await refused(figma, /named exactly|not "HDS Tokens & Components \(Copy\)"/);
  });

  it('any other file key', async () => {
    await refused(stagingFile('SOMEOTHERFILE000000000'), /SOMEOTHERFILE000000000/);
  });

  it('checks the deny list before the allow list', async () => {
    // The staging key, but the library's name: deny wins.
    await refused(stagingFile(LINKS.stagingFileKey, LINKS.libraryFileName), /library/);
    // A valid marker, but the library's name: deny wins.
    const marked = stagingFile(null, LINKS.libraryFileName);
    markAsStaging(marked);
    await refused(marked, /library/);
  });

  it('Plan is guarded the same way', async () => {
    const figma = stagingFile(LINKS.libraryFileKey);
    const plan = await runPlugin(PLUGIN, 'plan', figma);
    expect(plan.ok).toBe(false);
    expect(plan.error).toMatch(/published library/);
    expect(figma.writes).toEqual([]);
  });
});

describe('Mark this file as HDS staging', () => {
  const mark = async (figma, typedKey) => {
    const start = figma.writes.length;
    const result = await runPlugin(PLUGIN, 'mark', figma, { typedKey });
    return { result, writes: figma.writes.slice(start) };
  };

  it('marks a file named exactly like staging when the pasted key is the staging key, then Sync runs', async () => {
    const figma = stagingFile(null);
    const { result, writes } = await mark(figma, ` ${LINKS.stagingFileKey}\n`);
    expect(result.ok, result.error).toBe(true);
    expect(writes).toEqual(['root.pluginData:stagingFileKey']);
    expect(rootData(figma, 'stagingFileKey')).toBe(LINKS.stagingFileKey);
    expect((await runPlugin(PLUGIN, 'sync', figma)).ok).toBe(true);
  });

  it('refuses the library, by key or by name, whatever key is pasted', async () => {
    for (const [figma, typed] of [
      [stagingFile(LINKS.libraryFileKey, LINKS.libraryFileName), LINKS.stagingFileKey],
      [stagingFile(null, LINKS.libraryFileName), LINKS.stagingFileKey],
      [stagingFile(LINKS.libraryFileKey), LINKS.stagingFileKey],
      [stagingFile(null), LINKS.libraryFileKey],
    ]) {
      const { result, writes } = await mark(figma, typed);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/library/);
      expect(writes).toEqual([]);
    }
  });

  it('refuses a wrong key', async () => {
    const figma = stagingFile(null);
    const { result, writes } = await mark(figma, 'WRONGKEY00000000000000');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not the staging file key/);
    expect(writes).toEqual([]);
  });

  it('refuses a file not named exactly like staging', async () => {
    const figma = stagingFile(null, 'Scratch');
    const { result, writes } = await mark(figma, LINKS.stagingFileKey);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/named exactly/);
    expect(writes).toEqual([]);
  });
});

// ── What the bundle may and may not do ───────────────────────────────────────
describe('bundle handshake', () => {
  const refusedWith = async (fetch, figma = stagingFile()) => {
    const start = figma.writes.length;
    const result = await runPlugin(PLUGIN, 'sync', figma, { fetch });
    expect(result.ok).toBe(false);
    expect(figma.writes.slice(start)).toEqual([]);
    return result.error;
  };
  const namesUrlAndFix = (error) => {
    expect(error).toContain(BUNDLE_URL);
    expect(error).toMatch(/Nothing was read or written/);
    expect(error).toMatch(/run Sync again/i);
  };

  it('refuses a prune bundle with 0 deletes', async () => {
    const figma = stagingFile();
    expect((await runPlugin(PLUGIN, 'sync', figma)).ok).toBe(true);
    const semantic = (await figma.variables.getLocalVariableCollectionsAsync()).find(
      (c) => c.name === 'Hirobius/Semantic',
    );
    figma.variables.createVariable('legacy/unused', semantic, 'FLOAT');

    const pruning = rebundled((b) => {
      b.payload.options.prune = true;
    });
    const error = await refusedWith(serve(pruning), figma);
    expect(error).toMatch(/prune/);
    expect(
      (await figma.variables.getLocalVariablesAsync()).some((v) => v.name === 'legacy/unused'),
    ).toBe(true);
  });

  it('refuses a partial (scoped) bundle', async () => {
    const scoped = rebundled((b) => {
      b.payload.options.scope = ['primitive'];
    });
    expect(await refusedWith(serve(scoped))).toMatch(/whole model/);
  });

  it('a bundle naming another staging file cannot redirect writes', async () => {
    const elsewhere = 'ELSEWHEREKEY0000000000';
    const redirecting = {
      ...copy(BUNDLE),
      stagingFileKey: elsewhere,
      files: { stagingFileKey: elsewhere, stagingFileName: 'Elsewhere' },
      sync: { stagingFileKey: elsewhere },
    };
    expect(await refusedWith(serve(redirecting), stagingFile(elsewhere))).toMatch(elsewhere);
    const marked = stagingFile(null, 'Elsewhere');
    markAsStaging(marked, elsewhere);
    expect(await refusedWith(serve(redirecting), marked)).toMatch(/not marked as HDS staging/);
  });

  it('refuses a tampered payload, naming the URL and the fix', async () => {
    const tampered = copy(BUNDLE);
    tampered.payload.model.collections[0].variables[0].description = 'changed in transit';
    const error = await refusedWith(serve(tampered));
    expect(error).toMatch(/does not match its checksum/);
    namesUrlAndFix(error);
  });

  it('refuses pluginBuild skew, naming both builds, the fix and the expected code.js, but no URL', async () => {
    const newer = { ...copy(BUNDLE), pluginBuild: 'deadbeef' };
    const error = await refusedWith(serve(newer));
    expect(error).toContain(`build ${BUNDLE.pluginBuild}, main needs deadbeef`);
    expect(error).toContain('pnpm figma:push');
    expect(error).toContain(`Expected code.js checksum: ${BUNDLE.pluginFiles['code.js']}`);
    expect(error).not.toMatch(/https?:|:\/\/|www\./);
  });

  it('shows nothing but hex from a skewed bundle, so it cannot plant a link to code', async () => {
    const planted = {
      ...copy(BUNDLE),
      pluginBuild: 'https://evil.example/code.js',
      pluginFiles: { 'code.js': 'download https://evil.example/code.js' },
    };
    const error = await refusedWith(serve(planted));
    expect(error).toMatch(/out of date/);
    expect(error).not.toMatch(/https?:|:\/\/|evil/);
  });

  it('refuses a 404, naming the URL and the fix', async () => {
    const error = await refusedWith(serve('Not Found', 404));
    expect(error).toContain('HTTP 404');
    namesUrlAndFix(error);
  });

  it('refuses an offline fetch, naming the URL and the fix', async () => {
    const error = await refusedWith(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(error).toMatch(/Failed to fetch/);
    expect(error).toMatch(/offline/);
    namesUrlAndFix(error);
  });

  it('refuses a body that is not JSON, naming the URL and the fix', async () => {
    const error = await refusedWith(serve('<!doctype html><title>Sign in</title>'));
    expect(error).toMatch(/is not JSON/);
    namesUrlAndFix(error);
  });

  it('refuses when its window never answers (an out-of-date ui.html), naming the fix', async () => {
    const figma = stagingFile();
    const result = await runPlugin(PLUGIN, 'sync', figma, {
      fetch: () => new Promise(() => {}),
      codeSetTimeout: (fn) => setTimeout(fn, 0),
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/did not answer/);
    expect(result.error).toContain('pnpm figma:push');
    expect(figma.writes).toEqual([]);
  });

  it('refuses a command an out-of-date manifest.json still offers', async () => {
    const figma = stagingFile();
    const result = await runPlugin(PLUGIN, 'push', figma);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/manifest\.json is out of date/);
    expect(result.fetches).toEqual([]);
    expect(figma.writes).toEqual([]);
  });
});

// ── Receipt ──────────────────────────────────────────────────────────────────
describe('sync receipt', () => {
  it('is written last, after the push re-planned to 0 and stamped lastPush', async () => {
    const figma = stagingFile();
    expect((await runPlugin(PLUGIN, 'sync', figma)).ok).toBe(true);
    const receiptAt = figma.writes.indexOf('root.pluginData:syncReceipt');
    expect(receiptAt).toBe(figma.writes.length - 1);
    expect(figma.writes.indexOf('root.pluginData:lastPush')).toBeLessThan(receiptAt);
  });

  it('is never written when the push does not verify to 0', async () => {
    const figma = stagingFile();
    // A file where one value does not stick: the re-plan after the push is not 0.
    const create = figma.variables.createVariable;
    figma.variables.createVariable = (name, collection, type) => {
      const variable = create(name, collection, type);
      if (name === 'radius/8') variable.setValueForMode = () => {};
      return variable;
    };
    const result = await runPlugin(PLUGIN, 'sync', figma);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/still differs from the model/);
    expect(figma.writes.length).toBeGreaterThan(0);
    expect(rootData(figma, 'syncReceipt')).toBe('');
    expect(figma.writes).not.toContain('root.pluginData:syncReceipt');
  });

  it('is written again when the next Sync changes the file', async () => {
    const figma = stagingFile();
    expect((await runPlugin(PLUGIN, 'sync', figma)).ok).toBe(true);
    const first = JSON.parse(rootData(figma, 'syncReceipt'));
    (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === 'ring').remove();

    const again = await runPlugin(PLUGIN, 'sync', figma);
    expect(again.ok, again.error).toBe(true);
    const second = JSON.parse(rootData(figma, 'syncReceipt'));
    expect(second.line).toBe('updated 0 · created 1 · deleted 0');
    expect(second.post).toBe(again.result.checksum);
    expect(second.post).not.toBe(first.post);
  });
});

describe('Check this file', () => {
  it('records whether Figma exposes the file key, and writes nothing', async () => {
    const hidden = stagingFile(null);
    const check = await runPlugin(PLUGIN, 'check', hidden);
    expect(check.ok, check.error).toBe(true);
    expect(check.result.file).toEqual({
      name: LINKS.stagingFileName,
      key: null,
      fileKeyExposed: false,
    });
    expect(check.result.verdict).toBe('refused');
    expect(check.result.pluginBuild).toBe(BUNDLE.pluginBuild);
    expect(check.fetches).toEqual([]);
    expect(hidden.writes).toEqual([]);

    const exposed = await runPlugin(PLUGIN, 'check', stagingFile());
    expect(exposed.result.file.fileKeyExposed).toBe(true);
    expect(exposed.result.verdict).toBe('staging');
  });
});
