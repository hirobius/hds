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
import { hdsChecksum, hdsRenamedPath } from '../lib/figma-runtime.mjs';
import {
  buildUseFigmaPushScript,
  buildUseFigmaSnapshotScript,
  buildDevPlugin,
  buildPushPayload,
  PUSH_CHUNKS,
  runtimeSource,
} from '../lib/figma-scripts.mjs';
import { createFakeFigma } from './helpers/fake-figma.mjs';
import { fixtureModel, newFixtureFile } from './helpers/figma-fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const model = fixtureModel();

/** Runs a use_figma script body the way the MCP server does: async, with `figma` in scope. */
const runUseFigma = async (script, figma) => {
  const result = await vm.runInNewContext(`(async () => {\n${script}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
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

  it('push chunk by chunk in an isolated context, then converge to zero changes', async () => {
    const figma = newFixtureFile();
    const lines = [];
    for (const chunk of PUSH_CHUNKS) {
      const report = await runUseFigma(
        buildUseFigmaPushScript(model, { scope: chunk.scope }),
        figma,
      );
      lines.push(report.line);
    }
    expect(lines).toEqual([
      'updated 0 · created 20 · deleted 0',
      'updated 0 · created 29 · deleted 0',
      'updated 0 · created 7 · deleted 0',
      'updated 0 · created 6 · deleted 0',
      'updated 0 · created 6 · deleted 0',
    ]);
    const again = await runUseFigma(buildUseFigmaPushScript(model), figma);
    expect(again.line).toBe('updated 0 · created 0 · deleted 0');
  });

  it('a snapshot script returns the state with a checksum that verifies', async () => {
    const figma = newFixtureFile();
    await runUseFigma(buildUseFigmaPushScript(model), figma);
    const { checksum, snapshot } = await runUseFigma(buildUseFigmaSnapshotScript(), figma);
    expect(checksum).toBe(hdsChecksum(JSON.stringify(snapshot)));
    expect(snapshot.collections.map((c) => c.variables.length)).toEqual([19, 27, 6, 5]);
  });

  it('a mistyped payload digit makes the script fail before writing', async () => {
    const figma = newFixtureFile();
    const script = buildUseFigmaPushScript(model, { scope: ['primitive'] }).replace(
      '"value":8}',
      '"value":9}',
    );
    await expect(runUseFigma(script, figma)).rejects.toThrow(/does not match its checksum/);
    expect(figma.writes).toEqual([]);
  });
});

describe('development plugin', () => {
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

  it('declares plan, push and snapshot commands, and only says "prune" when built with it', () => {
    const plain = JSON.parse(buildDevPlugin(model)['manifest.json']);
    expect(plain.menu.filter((m) => m.command).map((m) => m.command)).toEqual([
      'plan',
      'push',
      'snapshot',
    ]);
    expect(JSON.stringify(plain.menu)).not.toMatch(/prune/i);
    const pruning = JSON.parse(buildDevPlugin(model, { prune: true })['manifest.json']);
    expect(pruning.menu.find((m) => m.command === 'push').name).toMatch(/prune/i);
    expect(plain.networkAccess).toEqual({ allowedDomains: ['none'] });
  });

  it('plans without writing, pushes, then snapshots', async () => {
    const figma = newFixtureFile();
    const files = buildDevPlugin(model);

    const plan = await runPlugin(files, 'plan', figma);
    expect(plan.ok).toBe(true);
    expect(plan.title).toMatch(/^Plan \(nothing written\): updated 0 · created \d+ · deleted 0$/);
    expect(figma.writes).toEqual([]);

    const pushed = await runPlugin(files, 'push', figma);
    expect(pushed.ok).toBe(true);
    expect(pushed.result.summary.variables.created).toBe(57);

    const snap = await runPlugin(files, 'snapshot', figma);
    expect(snap.fileName).toBe('figma-snapshot.json');
    expect(snap.result.checksum).toBe(hdsChecksum(JSON.stringify(snap.result.snapshot)));
  });

  it('shows the error instead of throwing when the push is refused', async () => {
    const figma = createFakeFigma({ fonts: [] });
    const result = await runPlugin(buildDevPlugin(model), 'push', figma);
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
