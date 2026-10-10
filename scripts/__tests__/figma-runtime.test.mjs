/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/figma-runtime.mjs must survive being copied into Figma, and the
 * generated carriers (use_figma scripts, development plugin) must run there.
 *
 * Seams: the runtime source text, and the generated script text executed in a
 * fresh V8 context that has the Plugin API (helpers/fake-figma.mjs) and
 * nothing from Node — no `process`, no `require`, no module scope.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { parse } from 'acorn';
import { hdsChecksum, hdsRenamedPath, hdsVerifyRuntime } from '../lib/figma-runtime.mjs';
import {
  buildUseFigmaPushScript,
  buildUseFigmaSnapshotScript,
  buildDevPlugin,
  buildPromotePlugin,
  buildPushPayload,
  buildSyncPlugin,
  PUSH_CHUNKS,
  runtimeSource,
} from '../lib/figma-scripts.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { createFakeFigma } from './helpers/fake-figma.mjs';
import { fixtureModel, newFixtureFile } from './helpers/figma-fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const model = fixtureModel();

const LINKS = Object.freeze({
  storybookUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: 'RETIREDKEY000000000000', fileName: 'HDS Tokens & Components (old)' }],
  // HDS Staging, the draft workbench (ADR-026, A4): in links.json, and never a target.
  stagingFileKey: 'STAGINGKEY000000000000',
  stagingFileName: 'HDS Staging',
});
const RETIRED_KEY = LINKS.retiredFiles[0].fileKey;
const STAGING_KEY = LINKS.stagingFileKey;
/** A use_figma push script for the fixture links (the library above). */
const pushScript = (options = {}) => buildUseFigmaPushScript(model, { ...options, links: LINKS });
const snapshotScript = () => buildUseFigmaSnapshotScript(LINKS);
/** An empty in-memory file that is the library: use_figma gives it the library key. */
const inLibrary = () => {
  const figma = newFixtureFile();
  figma.fileKey = LINKS.libraryFileKey;
  return figma;
};

/** Runs a use_figma script body the way the MCP server does: async, with `figma` in scope. */
const runUseFigma = async (script, figma) => {
  const result = await vm.runInNewContext(`(async () => {\n${script}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
};
/** The promote plugin and the development plugin it renames, for the fixture links (the library above). */
const promotePlugin = (options = {}) => buildPromotePlugin(model, { ...options, links: LINKS });
const devPlugin = (options = {}) => buildDevPlugin(model, { ...options, links: LINKS });
/** Runs a development plugin's code.js for one menu command and returns the first message it posts. */
const runPlugin = async (files, command, figma) => {
  const posted = [];
  figma.command = command;
  figma.showUI = () => {};
  figma.closePlugin = () => {};
  figma.ui = { postMessage: (message) => posted.push(message), onmessage: null };
  vm.runInNewContext(files['code.js'], { figma, __html__: files['ui.html'] });
  for (let i = 0; i < 50 && posted.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
  return JSON.parse(JSON.stringify(posted[0]));
};

describe('figma-runtime.mjs can be copied into Figma', () => {
  const source = readFileSync(join(HERE, '..', 'lib', 'figma-runtime.mjs'), 'utf8');

  it('holds only exported function declarations at top level, in ES2020', () => {
    const ast = parse(source, { ecmaVersion: 2020, sourceType: 'module' });
    const offenders = ast.body
      .filter(
        (node) =>
          node.type !== 'ExportNamedDeclaration' ||
          node.declaration?.type !== 'FunctionDeclaration',
      )
      .map((node) => source.slice(node.start, node.end).split('\n')[0]);
    expect(offenders).toEqual([]);
  });

  it('becomes a plain script once `export` is removed', () => {
    expect(runtimeSource()).not.toMatch(/^\s*(export|import)\b/m);
    expect(() => parse(runtimeSource(), { ecmaVersion: 2020, sourceType: 'script' })).not.toThrow();
  });

  it('is copied without its comments, which only cost script size', () => {
    const comments = [];
    parse(runtimeSource(), { ecmaVersion: 2020, sourceType: 'script', onComment: comments });
    expect(comments).toEqual([]);
    expect(runtimeSource()).toContain("return 'hirobius';");
  });
});

describe('use_figma scripts', () => {
  it('carry only the out-of-scope variables their aliases point at', () => {
    const { payload } = buildPushPayload(model, { scope: ['role'] });
    const paths = (key) =>
      payload.model.collections.find((c) => c.key === key).variables.map((v) => v.path);
    expect(paths('primitive')).toEqual([]);
    expect(paths('component')).toEqual([]);
    expect(paths('semantic').sort()).toEqual([
      'semantic.color.border.default',
      'semantic.color.content.primary',
      'semantic.color.surface.accent',
      'semantic.color.surface.page',
      'semantic.radius.action',
    ]);
    expect(paths('role')).toHaveLength(5);
  });

  it('with prune, carry the identity of every variable, so a moved one is recognised', () => {
    const { payload } = buildPushPayload(model, { scope: ['role'], prune: true });
    const component = payload.model.collections.find((c) => c.key === 'component');
    expect(component.variables).toHaveLength(6);
    expect(Object.keys(component.variables[0]).sort()).toEqual([
      'codeSyntax',
      'name',
      'path',
      'resolvedType',
    ]);
  });

  it('chunks cover every collection of the real model once, and alias only their own or earlier chunks', () => {
    const { model: real } = loadFigmaInputs(join(HERE, '..', '..'));
    const chunkOf = new Map(PUSH_CHUNKS.flatMap((chunk, i) => chunk.scope.map((key) => [key, i])));
    const keys = PUSH_CHUNKS.flatMap((chunk) => chunk.scope).filter((key) => key !== 'styles');
    expect([...keys].sort()).toEqual(real.collections.map((c) => c.key).sort());
    const homeOf = new Map(
      real.collections.flatMap((c) => c.variables.map((v) => [v.path, c.key])),
    );
    const late = real.collections.flatMap((c) =>
      c.variables.flatMap((v) =>
        Object.values(v.valuesByMode)
          .filter(
            (entry) => entry.alias && chunkOf.get(homeOf.get(entry.alias)) > chunkOf.get(c.key),
          )
          .map((entry) => `${v.path} -> ${entry.alias}`),
      ),
    );
    expect(late).toEqual([]);
  });

  it('push chunk by chunk in an isolated context, then converge to zero changes', async () => {
    const figma = inLibrary();
    const lines = [];
    for (const chunk of PUSH_CHUNKS) {
      const report = await runUseFigma(pushScript({ scope: chunk.scope }), figma);
      lines.push(report.line);
    }
    expect(lines).toEqual([
      'updated 0 · created 21 · deleted 0',
      'updated 0 · created 29 · deleted 0',
      'updated 0 · created 7 · deleted 0',
      'updated 0 · created 6 · deleted 0',
      'updated 0 · created 6 · deleted 0',
    ]);
    const again = await runUseFigma(pushScript(), figma);
    expect(again.line).toBe('updated 0 · created 0 · deleted 0');
  });

  it('a snapshot script returns the state with a checksum that verifies', async () => {
    const figma = inLibrary();
    await runUseFigma(pushScript(), figma);
    const { checksum, snapshot } = await runUseFigma(snapshotScript(), figma);
    expect(checksum).toBe(hdsChecksum(JSON.stringify(snapshot)));
    expect(snapshot.collections.map((c) => c.variables.length)).toEqual([20, 27, 6, 5]);
  });

  it('a mistyped payload digit makes the script fail before writing', async () => {
    const figma = inLibrary();
    const script = pushScript({ scope: ['primitive'] }).replace('"value":8}', '"value":9}');
    await expect(runUseFigma(script, figma)).rejects.toThrow(/does not match its checksum/);
    expect(figma.writes).toEqual([]);
  });

  describe('never prune, and refuse any file but the library (ADR-026, amended 2026-10-07)', () => {
    const OTHER_KEY = 'SOMEOTHERFILE000000000';
    /** Every use_figma script `pnpm figma:push` writes from the push engine: one per chunk, a full push, and the snapshot. */
    const scripts = () => [
      ...PUSH_CHUNKS.map((chunk) => [chunk.id, pushScript({ scope: chunk.scope })]),
      ['full push', pushScript()],
      ['snapshot.js', snapshotScript()],
    ];
    const statements = (script) =>
      parse(script, {
        ecmaVersion: 2020,
        sourceType: 'script',
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
      }).body;

    it('a push script refuses to build with prune: agents never delete in the library', () => {
      for (const scope of [null, ...PUSH_CHUNKS.map((chunk) => chunk.scope)]) {
        expect(() => pushScript({ scope, prune: true })).toThrow(
          /never prune.*promote plugin.*Adrian/,
        );
      }
    });

    it('a push or snapshot script refuses to build without the library key', () => {
      const { libraryFileKey: _key, ...keyless } = LINKS;
      expect(() => buildUseFigmaPushScript(model, { links: keyless })).toThrow(/libraryFileKey/);
      expect(() => buildUseFigmaPushScript(model)).toThrow(/libraryFileKey/);
      expect(() => buildUseFigmaSnapshotScript(keyless)).toThrow(/libraryFileKey/);
      expect(() => buildUseFigmaSnapshotScript()).toThrow(/libraryFileKey/);
    });

    it('the first statement of each refuses any file but the library, and a retired key', () => {
      for (const [id, script] of scripts()) {
        const [first] = statements(script);
        const text = script.slice(first.start, first.end);
        expect(first.type, id).toBe('IfStatement');
        expect(text, id).toContain(`figma.fileKey !== '${LINKS.libraryFileKey}'`);
        expect(text, id).toContain(`'${RETIRED_KEY}'`);
        expect(text, id).toMatch(/throw new Error\('Refused: this is not the HDS library/);
      }
    });

    it('a retired file, a file with no key or any other file: reads nothing but figma.fileKey', async () => {
      for (const key of [RETIRED_KEY, STAGING_KEY, null, undefined, OTHER_KEY]) {
        for (const [id, script] of scripts()) {
          const figma = newFixtureFile();
          figma.fileKey = key;
          const reads = [];
          const proxy = new Proxy(figma, {
            get(target, prop) {
              reads.push(String(prop));
              return Reflect.get(target, prop);
            },
          });
          await expect(runUseFigma(script, proxy), `${id} in ${key}`).rejects.toThrow(
            /not the HDS library.*Nothing was read or written/,
          );
          expect(reads, `${id} in ${key}`).toEqual(['fileKey']);
          expect(figma.writes, `${id} in ${key}`).toEqual([]);
        }
      }
    });
  });

  describe('verify their own runtime code before they read or write', () => {
    // A line an agent could alter while passing the script through use_figma:
    // with `true`, a push without prune would delete every extra variable.
    const pruneGuard = 'if (prune) plan.removals.variables.push(item);';

    it('a changed line of runtime code makes a push script fail before writing', async () => {
      const figma = inLibrary();
      await runUseFigma(pushScript(), figma);
      const semantic = (await figma.variables.getLocalVariableCollectionsAsync()).find(
        (c) => c.name === 'Hirobius/Semantic',
      );
      figma.variables.createVariable('legacy/unused', semantic, 'FLOAT');
      const script = pushScript({ scope: ['semantic'] });
      expect(script).toContain(pruneGuard);
      const start = figma.writes.length;

      await expect(
        runUseFigma(
          script.replace(pruneGuard, 'if (true) plan.removals.variables.push(item);'),
          figma,
        ),
      ).rejects.toThrow(/code does not match its checksum.*Nothing was read or written/);
      expect(figma.writes.slice(start)).toEqual([]);
    });

    it('a changed snapshot script fails before reading', async () => {
      const script = snapshotScript().replace(
        'takenAt: new Date().toISOString(),',
        "takenAt: '2020-01-01T00:00:00.000Z',",
      );
      await expect(runUseFigma(script, inLibrary())).rejects.toThrow(
        /code does not match its checksum/,
      );
    });

    it('still run when a transport turns the line endings into CRLF', async () => {
      const figma = inLibrary();
      const report = await runUseFigma(pushScript().replace(/\n/g, '\r\n'), figma);
      expect(report.summary.variables.created).toBe(58);
    });

    describe('where Figma hides function source, refuse and name the plugin that does the job (hds#415)', () => {
      const hidden =
        "Function.prototype.toString = function () { return 'function () { [native code] }'; };\n";
      const HIDDEN =
        'This Figma runtime does not expose function source, so the script cannot read its own code to check it. Nothing was read or written.';
      const TO_SYNC =
        'Use the Sync plugin "HDS tokens sync" (figma/push/plugin/manifest.json), which Figma loads from disk.';
      const TO_PROMOTE =
        'Use the promote plugin "HDS tokens promote (baked)" (figma/push/promote/manifest.json), which Figma loads from disk.';
      /** The message a script throws in a sandbox that hides function source, and the writes it made. */
      const refusal = async (script) => {
        const figma = inLibrary();
        const error = await runUseFigma(hidden + script, figma).then(
          () => null,
          (thrown) => thrown,
        );
        return { message: error && error.message, writes: figma.writes };
      };

      it('the runtime names the promote plugin for a pruning carrier, the only one that deletes', () => {
        // No use_figma script prunes (below); the branch stays for the runtime's other callers.
        const fn = () => {};
        fn.toString = () => 'function () { [native code] }';
        expect(() => hdsVerifyRuntime([fn], '00000000', true)).toThrow(`${HIDDEN} ${TO_PROMOTE}`);
        expect(() => hdsVerifyRuntime([fn], '00000000', false)).toThrow(`${HIDDEN} ${TO_SYNC}`);
      });

      it('a push script without prune names the Sync plugin', async () => {
        for (const chunk of [{ id: 'full push', scope: null }, ...PUSH_CHUNKS]) {
          const script = pushScript({ scope: chunk.scope });
          expect(await refusal(script), chunk.id).toEqual({
            message: `${HIDDEN} ${TO_SYNC}`,
            writes: [],
          });
        }
      });

      it('the snapshot script, which never prunes, names the Sync plugin', async () => {
        expect(await refusal(snapshotScript())).toEqual({
          message: `${HIDDEN} ${TO_SYNC}`,
          writes: [],
        });
      });

      it('name each plugin exactly as its manifest does', () => {
        const links = JSON.parse(
          readFileSync(join(HERE, '..', '..', 'figma', 'links.json'), 'utf8'),
        );
        const nameOf = (files) => JSON.parse(files['manifest.json']).name;
        expect(TO_SYNC).toContain(`"${nameOf(buildSyncPlugin(links))}"`);
        expect(TO_PROMOTE).toContain(
          `"${nameOf(buildPromotePlugin(model, { prune: true, links }))}"`,
        );
      });
    });
  });
});

describe('Sync plugin manifest (figma/push/plugin, hds#411)', () => {
  const links = JSON.parse(readFileSync(join(HERE, '..', '..', 'figma', 'links.json'), 'utf8'));
  const manifest = JSON.parse(buildSyncPlugin(links)['manifest.json']);

  it('keeps the id Figma already imported, so no re-import is needed', () => {
    expect(manifest.id).toBe('hds-tokens-sync-dev');
    expect(manifest.name).toBe('HDS tokens sync');
  });

  it('declares Sync, Plan, Check and Mark, and asks Figma for the file key', () => {
    expect(manifest.menu.filter((m) => m.command)).toEqual([
      { name: 'Sync', command: 'sync' },
      { name: 'Plan (dry run)', command: 'plan' },
      { name: 'Check this file', command: 'check' },
      { name: 'Mark this file as the HDS library', command: 'mark' },
    ]);
    expect(manifest.enablePrivatePluginApi).toBe(true);
  });

  it('may reach exactly one origin: the docs site that serves the bundle', () => {
    expect(manifest.networkAccess.allowedDomains).toEqual([
      'https://hirobius-hds-components.vercel.app',
    ]);
    expect(manifest.networkAccess.reasoning).toMatch(/data only/);
    expect(Object.keys(manifest.networkAccess).sort()).toEqual(['allowedDomains', 'reasoning']);
  });
});

describe("promote plugin (figma/push/promote): today's baked plugin, renamed", () => {
  it('equals buildDevPlugin output except the manifest id and name, with and without prune', () => {
    for (const options of [{}, { prune: true, renames: { 'a.b': 'a.c' } }]) {
      const baked = devPlugin(options);
      const promote = promotePlugin(options);
      expect(Object.keys(promote).sort()).toEqual(Object.keys(baked).sort());
      expect(promote['code.js']).toBe(baked['code.js']);
      expect(promote['ui.html']).toBe(baked['ui.html']);
      const { id, name, ...rest } = JSON.parse(promote['manifest.json']);
      const { id: bakedId, name: bakedName, ...bakedRest } = JSON.parse(baked['manifest.json']);
      expect({ id, name }).toEqual({
        id: 'hds-tokens-promote-dev',
        name: 'HDS tokens promote (baked)',
      });
      expect({ id: bakedId, name: bakedName }).not.toEqual({ id, name });
      expect(rest).toEqual(bakedRest);
      expect(rest.networkAccess).toEqual({ allowedDomains: ['none'] });
    }
  });
});

describe('promote plugin runs in the library only, like Sync (ADR-026, A4)', () => {
  // HDS Staging has no local variables by design: a push there would create them,
  // and a prune there would delete a draft's work. The guard is the Sync plugin's.
  const COMMANDS = ['plan', 'push', 'snapshot'];
  const REFUSED =
    /^Refused: the promote plugin runs in the HDS library only \("HDS Tokens & Components", LIBRARYKEY000000000000\), never in HDS Staging or a retired file\. /;
  /** A file the promote plugin must refuse: by key, or with no key, by name or for want of the marker. */
  const notTheLibrary = () => {
    const file = (key, fileName = 'Some file') => {
      const figma = newFixtureFile({ fileName });
      if (key !== null) figma.fileKey = key;
      return figma;
    };
    const marked = (figma) => {
      figma.root.setSharedPluginData('hirobius', 'libraryFileKey', LINKS.libraryFileKey);
      figma.writes.length = 0;
      return figma;
    };
    return [
      ['HDS Staging by its key', file(STAGING_KEY, 'HDS Staging')],
      [
        'HDS Staging with no key, marked as the library by mistake',
        marked(file(null, 'HDS Staging')),
      ],
      ['the retired file by its key', file(RETIRED_KEY, LINKS.libraryFileName)],
      [
        'the retired file with no key, by its name',
        marked(file(null, 'HDS Tokens & Components (old)')),
      ],
      ['any other file', file('SOMEOTHERFILE000000000')],
      ['a file with no key and no library marker', file(null, LINKS.libraryFileName)],
    ];
  };

  it('refuses to build without the library key or name, or the retired files', () => {
    const { libraryFileKey: _key, ...keyless } = LINKS;
    const { retiredFiles: _retired, ...unretired } = LINKS;
    expect(() => buildPromotePlugin(model)).toThrow(/libraryFileKey/);
    expect(() => buildPromotePlugin(model, { links: keyless })).toThrow(/libraryFileKey/);
    expect(() => buildPromotePlugin(model, { links: unretired })).toThrow(/retiredFiles/);
    expect(() => buildDevPlugin(model)).toThrow(/libraryFileKey/);
  });

  it('asks Figma for the file key, as Sync does', () => {
    expect(JSON.parse(promotePlugin()['manifest.json']).enablePrivatePluginApi).toBe(true);
  });

  it('bakes the library and the retired files, never HDS Staging', () => {
    for (const options of [{}, { prune: true }]) {
      const code = promotePlugin(options)['code.js'];
      const baked = JSON.parse(code.match(/^const LIBRARY = Object\.freeze\((.*)\);$/m)[1]);
      expect(baked).toEqual({
        libraryFileKey: LINKS.libraryFileKey,
        libraryFileName: LINKS.libraryFileName,
        retiredFileKeys: [RETIRED_KEY],
        retiredFileNames: [LINKS.retiredFiles[0].fileName],
      });
      expect(code.includes(STAGING_KEY), 'staging key in code.js').toBe(false);
    }
  });

  it('refuses HDS Staging, a retired file and any other file for every command, with or without prune, writing nothing', async () => {
    for (const options of [{}, { prune: true }]) {
      const files = promotePlugin(options);
      for (const command of COMMANDS) {
        for (const [what, figma] of notTheLibrary()) {
          const at = `${command}${options.prune ? ' (prune)' : ''} in ${what}`;
          const result = await runPlugin(files, command, figma);
          expect(result.ok, at).toBe(false);
          expect(result.error, at).toMatch(REFUSED);
          expect(result.error, at).toMatch(/Nothing was read or written\./);
          expect(figma.writes, at).toEqual([]);
          expect(await figma.variables.getLocalVariableCollectionsAsync(), at).toEqual([]);
        }
      }
    }
  });

  it('names the promote plugin in the refusal, never Sync', async () => {
    const figma = newFixtureFile({ fileName: 'HDS Staging' });
    figma.fileKey = STAGING_KEY;
    const { error } = await runPlugin(promotePlugin({ prune: true }), 'push', figma);
    expect(error).toMatch(/run the promote plugin there/);
    expect(error).not.toMatch(/\bSync\b/);
  });

  it('runs in the library by its key, and where Figma gives no key, in a file marked and named like it', async () => {
    const byKey = inLibrary();
    const pushed = await runPlugin(promotePlugin(), 'push', byKey);
    expect(pushed.ok, pushed.error).toBe(true);
    expect(pushed.result.summary.variables.created).toBe(58);

    const keyless = newFixtureFile({ fileName: LINKS.libraryFileName });
    keyless.root.setSharedPluginData('hirobius', 'libraryFileKey', LINKS.libraryFileKey);
    const planned = await runPlugin(promotePlugin(), 'plan', keyless);
    expect(planned.ok, planned.error).toBe(true);
  });
});

describe('development plugin', () => {
  it('declares plan, push and snapshot commands, and only says "prune" when built with it', () => {
    const plain = JSON.parse(devPlugin()['manifest.json']);
    expect(plain.menu.filter((m) => m.command).map((m) => m.command)).toEqual([
      'plan',
      'push',
      'snapshot',
    ]);
    expect(JSON.stringify(plain.menu)).not.toMatch(/prune/i);
    const pruning = JSON.parse(devPlugin({ prune: true })['manifest.json']);
    expect(pruning.menu.find((m) => m.command === 'push').name).toMatch(/prune/i);
    expect(plain.networkAccess).toEqual({ allowedDomains: ['none'] });
  });

  it('plans without writing, pushes, then snapshots', async () => {
    const figma = inLibrary();
    const files = devPlugin();

    const plan = await runPlugin(files, 'plan', figma);
    expect(plan.ok).toBe(true);
    expect(plan.title).toMatch(/^Plan \(nothing written\): updated 0 · created \d+ · deleted 0$/);
    expect(figma.writes).toEqual([]);

    const pushed = await runPlugin(files, 'push', figma);
    expect(pushed.ok).toBe(true);
    expect(pushed.result.summary.variables.created).toBe(58);

    const snap = await runPlugin(files, 'snapshot', figma);
    expect(snap.fileName).toBe('figma-snapshot.json');
    expect(snap.result.checksum).toBe(hdsChecksum(JSON.stringify(snap.result.snapshot)));
  });

  it('shows the error instead of throwing when the push is refused', async () => {
    const figma = createFakeFigma({ fonts: [] });
    figma.fileKey = LINKS.libraryFileKey;
    const result = await runPlugin(devPlugin(), 'push', figma);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Nothing was written/);
  });
});

describe('runtime helpers', () => {
  it('hdsChecksum is 32-bit FNV-1a', () => {
    expect(hdsChecksum('')).toBe('811c9dc5');
    expect(hdsChecksum('a')).toBe('e40c292c');
  });

  it('hdsRenamedPath follows composite renames and chains, on whole segments only', () => {
    const renames = {
      'semantic.typography.caption': 'semantic.typography.eyebrow',
      'a.b': 'a.c',
      'a.c': 'a.d',
    };
    expect(hdsRenamedPath('semantic.typography.caption.font-size', renames)).toBe(
      'semantic.typography.eyebrow.font-size',
    );
    expect(hdsRenamedPath('a.b', renames)).toBe('a.d');
    expect(hdsRenamedPath('a.bc', renames)).toBeNull();
    expect(hdsRenamedPath('x.y', renames)).toBeNull();
    expect(hdsRenamedPath(null, renames)).toBeNull();
  });
});
