/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * Bound-colour fallbacks (hds, 2026-10-12). A paint or effect bound to a colour
 * variable also stores a raw colour that Figma renders where the binding cannot
 * resolve; the Kbd drop shadow was bound to color/border/strong over pure
 * black. Covers the finder (pure, plain objects), the walker (a fake document),
 * the use_figma carrier, the record in figma/snapshot.json and the check that
 * fails on it.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { hdsChecksum } from '../lib/figma-runtime.mjs';
import {
  hdsFallbackColorText,
  hdsFallbackDiffers,
  hdsFallbackResolve,
  hdsFallbackNode,
  hdsFallbackWalk,
  hdsReadFallbacks,
} from '../lib/figma-fallbacks.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import {
  buildUseFigmaFallbacksScript,
  fallbacksRuntimeSource,
  FALLBACK_SKIP_PAGE_IDS,
} from '../lib/figma-scripts.mjs';
import { ingestFallbacks, ingestSnapshot } from '../figma-snapshot.mjs';
import { runFallbackCheck } from '../check-figma-fallbacks.mjs';
import { writePushArtifacts } from '../figma-push.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

// ── fixtures: plain objects, no Figma ────────────────────────────────────────
const hex = (h) => ({
  r: parseInt(h.slice(1, 3), 16) / 255,
  g: parseInt(h.slice(3, 5), 16) / 255,
  b: parseInt(h.slice(5, 7), 16) / 255,
});
const GREY = hex('#cbd5e1');
const WHITE = hex('#ffffff');

/** A library with a Light/Dark Semantic collection and a Primitive one, the way hdsFallbackIndex flattens it. */
const INDEX = {
  defaultModes: { 'C:semantic': 'mode:light', 'C:primitive': 'mode:base' },
  variables: {
    'V:strong': {
      name: 'color/border/strong',
      resolvedType: 'COLOR',
      collectionId: 'C:semantic',
      valuesByMode: {
        'mode:light': { type: 'VARIABLE_ALIAS', id: 'V:slate-300' },
        'mode:dark': { type: 'VARIABLE_ALIAS', id: 'V:slate-700' },
      },
    },
    'V:slate-300': {
      name: 'slate/300',
      resolvedType: 'COLOR',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': { ...GREY, a: 1 } },
    },
    'V:slate-700': {
      name: 'slate/700',
      resolvedType: 'COLOR',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': { ...hex('#334155'), a: 1 } },
    },
    'V:white': {
      name: 'color/surface/base',
      resolvedType: 'COLOR',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': { ...WHITE, a: 1 } },
    },
    'V:space': {
      name: 'space/4',
      resolvedType: 'FLOAT',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': 16 },
    },
    'V:loop-a': {
      name: 'loop/a',
      resolvedType: 'COLOR',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': { type: 'VARIABLE_ALIAS', id: 'V:loop-b' } },
    },
    'V:loop-b': {
      name: 'loop/b',
      resolvedType: 'COLOR',
      collectionId: 'C:primitive',
      valuesByMode: { 'mode:base': { type: 'VARIABLE_ALIAS', id: 'V:loop-a' } },
    },
  },
};

const bound = (id) => ({ boundVariables: { color: { type: 'VARIABLE_ALIAS', id } } });
const solid = (color, id) => ({ type: 'SOLID', color, ...(id ? bound(id) : {}) });
const shadow = (color, id) => ({
  type: 'DROP_SHADOW',
  color: { ...color, a: color.a ?? 0.25 },
  ...(id ? bound(id) : {}),
});

describe('colour comparison', () => {
  it('tolerates one 8-bit step per channel and no more', () => {
    const base = hex('#cbd5e1');
    expect(hdsFallbackDiffers(base, hex('#cbd5e2'), false)).toBe(false);
    expect(hdsFallbackDiffers(base, hex('#cbd5e3'), false)).toBe(true);
    expect(hdsFallbackDiffers(hex('#000000'), base, false)).toBe(true);
  });

  it('compares alpha only when asked (a paint keeps its opacity in another field)', () => {
    const a = { ...GREY, a: 0.25 };
    const b = { ...GREY, a: 1 };
    expect(hdsFallbackDiffers(a, b, false)).toBe(false);
    expect(hdsFallbackDiffers(a, b, true)).toBe(true);
    expect(hdsFallbackDiffers({ ...GREY }, { ...GREY, a: 1 }, true)).toBe(false);
  });

  it('prints #rrggbb, or #rrggbbaa for an effect', () => {
    expect(hdsFallbackColorText(GREY, false)).toBe('#cbd5e1');
    expect(hdsFallbackColorText({ ...GREY, a: 0.25 }, true)).toBe('#cbd5e140');
    expect(hdsFallbackColorText(GREY, true)).toBe('#cbd5e1ff');
  });
});

describe('hdsFallbackResolve', () => {
  it('follows aliases to the default mode of each collection', () => {
    const got = hdsFallbackResolve(INDEX, 'V:strong');
    expect(got.name).toBe('color/border/strong');
    expect(hdsFallbackColorText(got.color, false)).toBe('#cbd5e1');
  });

  it('ignores the non-default modes', () => {
    expect(hdsFallbackColorText(hdsFallbackResolve(INDEX, 'V:strong').color, false)).not.toBe(
      '#334155',
    );
  });

  it('returns null for a number, an unknown id and an alias loop', () => {
    expect(hdsFallbackResolve(INDEX, 'V:space')).toBeNull();
    expect(hdsFallbackResolve(INDEX, 'V:nope')).toBeNull();
    expect(hdsFallbackResolve(INDEX, 'V:loop-a')).toBeNull();
  });
});

describe('hdsFallbackNode', () => {
  const node = (extra) => ({ id: '1:1', name: 'Size=md', type: 'COMPONENT', ...extra });

  it('finds the Kbd shadow: bound to color/border/strong over a black raw colour', () => {
    const got = hdsFallbackNode(
      node({ effects: [shadow({ r: 0, g: 0, b: 0, a: 0.25 }, 'V:strong')] }),
      'Kbd',
      INDEX,
    );
    expect(got).toEqual([
      {
        nodeId: '1:1',
        nodeName: 'Size=md',
        page: 'Kbd',
        kind: 'effect',
        variable: 'color/border/strong',
        raw: '#00000040',
        expected: '#cbd5e1ff',
      },
    ]);
  });

  it('passes an effect whose raw colour is the variable (alpha included)', () => {
    const effect = { ...shadow({ ...GREY, a: 1 }, 'V:strong') };
    expect(hdsFallbackNode(node({ effects: [effect] }), 'Kbd', INDEX)).toEqual([]);
  });

  it('finds a fill and a stroke, naming the kind', () => {
    const got = hdsFallbackNode(
      node({
        fills: [solid(WHITE, 'V:strong')],
        strokes: [solid(hex('#000000'), 'V:strong')],
      }),
      'Slider',
      INDEX,
    );
    expect(got.map((item) => [item.kind, item.raw, item.expected])).toEqual([
      ['fill', '#ffffff', '#cbd5e1'],
      ['stroke', '#000000', '#cbd5e1'],
    ]);
  });

  it('ignores the opacity of a paint', () => {
    const paint = { ...solid(GREY, 'V:strong'), opacity: 0.4 };
    expect(hdsFallbackNode(node({ fills: [paint] }), 'P', INDEX)).toEqual([]);
  });

  it('ignores an unbound layer, a gradient, a number variable and a mixed fill', () => {
    expect(hdsFallbackNode(node({ fills: [solid(hex('#ff0000'))] }), 'P', INDEX)).toEqual([]);
    expect(
      hdsFallbackNode(
        node({ fills: [{ type: 'GRADIENT_LINEAR', ...bound('V:strong'), color: hex('#ff0000') }] }),
        'P',
        INDEX,
      ),
    ).toEqual([]);
    expect(
      hdsFallbackNode(node({ fills: [solid(hex('#ff0000'), 'V:space')] }), 'P', INDEX),
    ).toEqual([]);
    expect(hdsFallbackNode(node({ fills: Symbol('mixed') }), 'P', INDEX)).toEqual([]);
  });
});

describe('hdsFallbackWalk', () => {
  const wrong = [solid(hex('#000000'), 'V:strong')];
  const tree = {
    id: '2:1',
    name: 'Frame',
    type: 'FRAME',
    fills: wrong,
    children: [
      {
        id: '2:2',
        name: 'Set',
        type: 'COMPONENT_SET',
        children: [
          {
            id: '2:3',
            name: 'Variant',
            type: 'COMPONENT',
            fills: wrong,
            children: [{ id: '2:4', name: 'Inner', type: 'RECTANGLE', fills: wrong }],
          },
        ],
      },
      {
        id: '2:5',
        name: 'Use',
        type: 'INSTANCE',
        fills: wrong,
        children: [{ id: '2:6', name: 'Inside', type: 'RECTANGLE', fills: wrong }],
      },
    ],
  };
  const ids = (scope) => {
    const tally = { nodes: 0, bindings: 0, found: [] };
    hdsFallbackWalk(tree, 'P', INDEX, scope, tally, false);
    return { ids: tally.found.map((item) => item.nodeId), tally };
  };

  it('checks an instance itself but never what is inside it', () => {
    const { ids: found, tally } = ids('all');
    expect(found).toEqual(['2:1', '2:3', '2:4', '2:5']);
    expect(tally.nodes).toBe(5);
    expect(tally.bindings).toBe(4);
  });

  it('with scope "components" checks components and what is inside them only', () => {
    expect(ids('components').ids).toEqual(['2:3', '2:4']);
  });
});

// ── the sweep, over a fake document ──────────────────────────────────────────
function fakeFigma({ pages, fileKey = 'LIB' }) {
  const loaded = [];
  return {
    fileKey,
    loaded,
    root: {
      children: pages.map((page) => ({
        type: 'PAGE',
        ...page,
        loadAsync: async () => loaded.push(page.id),
      })),
    },
    variables: {
      getLocalVariableCollectionsAsync: async () =>
        Object.entries(INDEX.defaultModes).map(([id, defaultModeId]) => ({ id, defaultModeId })),
      getLocalVariablesAsync: async () =>
        Object.entries(INDEX.variables).map(([id, v]) => ({
          id,
          name: v.name,
          resolvedType: v.resolvedType,
          variableCollectionId: v.collectionId,
          valuesByMode: v.valuesByMode,
        })),
    },
  };
}
const badNode = (id, name) => ({
  id,
  name,
  type: 'COMPONENT',
  effects: [shadow({ r: 0, g: 0, b: 0, a: 0.25 }, 'V:strong')],
});
const goodNode = (id) => ({
  id,
  name: 'ok',
  type: 'COMPONENT',
  fills: [solid(GREY, 'V:strong')],
});
const OPTIONS = { scope: 'all', skipPages: [...FALLBACK_SKIP_PAGE_IDS], maxChars: 15000 };
const document = () =>
  fakeFigma({
    pages: [
      {
        id: '10:1',
        name: 'Kbd',
        children: [badNode('10:3', 'Size=sm'), badNode('10:2', 'Size=md')],
      },
      { id: '10:5', name: 'Badge', children: [goodNode('10:6')] },
      { id: '2157:826', name: 'Deprecated', children: [badNode('2157:900', 'old')] },
      { id: '2083:2', name: 'Archive', children: [badNode('2083:9', 'older')] },
    ],
  });

describe('hdsReadFallbacks', () => {
  it('leaves out the Deprecated and Archive pages without loading them, and sorts what it finds', async () => {
    const figma = document();
    const record = await hdsReadFallbacks(figma, OPTIONS);
    expect(figma.loaded).toEqual(['10:1', '10:5']);
    expect(record.skippedPages).toEqual([
      { id: '2157:826', name: 'Deprecated' },
      { id: '2083:2', name: 'Archive' },
    ]);
    expect(record.pages).toBe(2);
    expect(record.mismatches.map((m) => m.nodeId)).toEqual(['10:2', '10:3']);
    expect(record.bindings).toBe(3);
    expect(record.nodes).toBe(3);
  });

  it('signs the record: the checksum is the FNV-1a of the rest of it', async () => {
    const { checksum, ...rest } = await hdsReadFallbacks(document(), OPTIONS);
    expect(checksum).toBe(hdsChecksum(JSON.stringify(rest)));
  });

  it('records an empty list when every raw colour is right', async () => {
    const figma = fakeFigma({ pages: [{ id: '1:1', name: 'A', children: [goodNode('1:2')] }] });
    const record = await hdsReadFallbacks(figma, OPTIONS);
    expect(record.mismatches).toEqual([]);
    expect(record.bindings).toBe(1);
  });

  it('returns tooLarge, never a cut-short list', async () => {
    const result = await hdsReadFallbacks(document(), { ...OPTIONS, maxChars: 200 });
    expect(result.tooLarge).toBe(true);
    expect(result.mismatches).toBe(2);
    expect(result.next).toMatch(/does not page/);
  });
});

// ── the use_figma carrier ────────────────────────────────────────────────────
const LINKS = {
  libraryFileKey: 'LIB',
  libraryFileName: 'HDS Tokens & Components',
  docsUrl: 'https://example.test',
  retiredFiles: [],
};
async function run(text, figma) {
  const result = await vm.runInNewContext(`(async () => {\n${text}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
}

describe('fallbacks.js', () => {
  it('returns the record the ingest accepts, from the baked runtime', async () => {
    const record = await run(buildUseFigmaFallbacksScript(LINKS), document());
    expect(record.format).toBe('binding-fallbacks');
    expect(record.scope).toBe('all');
    expect(record.mismatches.map((m) => m.nodeId)).toEqual(['10:2', '10:3']);
  });

  it('fallbacks-components.js bakes the components scope', async () => {
    const text = buildUseFigmaFallbacksScript(LINKS, { scope: 'components' });
    expect(text).toMatch(/"scope":"components"/);
    const figma = fakeFigma({
      pages: [
        {
          id: '1:1',
          name: 'A',
          children: [
            { id: '1:2', name: 'Frame', type: 'FRAME', fills: [solid(WHITE, 'V:strong')] },
            { id: '1:3', name: 'Set', type: 'COMPONENT_SET', fills: [solid(WHITE, 'V:strong')] },
          ],
        },
      ],
    });
    expect((await run(text, figma)).mismatches.map((m) => m.nodeId)).toEqual(['1:3']);
  });

  it('refuses any file but the library, before it reads anything', async () => {
    const figma = document();
    figma.fileKey = 'SOMEOTHERFILE';
    await expect(run(buildUseFigmaFallbacksScript(LINKS), figma)).rejects.toThrow(
      /not the HDS library/,
    );
    expect(figma.loaded).toEqual([]);
  });

  it('refuses runtime code changed after it was generated', async () => {
    const text = buildUseFigmaFallbacksScript(LINKS).replace('16', '15');
    await expect(run(text, document())).rejects.toThrow(/does not match its checksum/);
  });

  it('carries no write function', () => {
    const text = buildUseFigmaFallbacksScript(LINKS);
    for (const write of [
      'hdsApply',
      'hdsPlan',
      'setBoundVariable',
      'createVariable',
      'setSharedPluginData',
    ]) {
      expect(text).not.toContain(write);
    }
  });

  it('is written by pnpm figma:push beside snapshot.js', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'fallbacks-push-'));
    const { files } = writePushArtifacts({ root: REPO, outDir });
    const paths = files.map((f) => f.path);
    expect(paths).toContain('use-figma/fallbacks.js');
    expect(paths).toContain('use-figma/fallbacks-components.js');
    const size = files.find((f) => f.path === 'use-figma/fallbacks.js').bytes;
    expect(size).toBeLessThan(10000);
  });
});

describe('figma-fallbacks.mjs can be copied into a use_figma script', () => {
  const source = readFileSync(join(HERE, '..', 'lib', 'figma-fallbacks.mjs'), 'utf8');

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
    const script = fallbacksRuntimeSource();
    expect(script).not.toMatch(/^\s*(export|import)\b/m);
    const comments = [];
    parse(script, { ecmaVersion: 2020, sourceType: 'script', onComment: comments });
    expect(comments).toEqual([]);
  });
});

// ── the record in figma/snapshot.json, and the check ─────────────────────────
const committed = parseSnapshotFile(readFileSync(join(REPO, 'figma', 'snapshot.json'), 'utf8'));

function tempRoot(snapshotFile = committed) {
  const root = mkdtempSync(join(tmpdir(), 'fallbacks-'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'snapshot.json'), serializeSnapshotFile(snapshotFile));
  writeFileSync(
    join(root, 'figma', 'links.json'),
    JSON.stringify({ ...LINKS, libraryFileKey: committed.snapshot.file.key }),
  );
  return root;
}
const onDisk = (root) => readFileSync(join(root, 'figma', 'snapshot.json'), 'utf8');
const saved = (root, value) => {
  const path = join(root, 'sweep.json');
  writeFileSync(path, JSON.stringify(value));
  return path;
};
async function sweep(mismatchNodes) {
  const figma = fakeFigma({
    fileKey: committed.snapshot.file.key,
    pages: [{ id: '10:1', name: 'Kbd', children: mismatchNodes }],
  });
  return JSON.parse(JSON.stringify(await hdsReadFallbacks(figma, OPTIONS)));
}

describe('the record in figma/snapshot.json', () => {
  it('keeps the snapshot and its checksum as they were', async () => {
    const root = tempRoot();
    const record = await sweep([badNode('10:2', 'Size=md')]);
    ingestFallbacks({ root, from: saved(root, record) });
    const after = parseSnapshotFile(onDisk(root));
    expect(after.checksum).toBe(committed.checksum);
    expect(after.snapshot).toEqual(committed.snapshot);
    expect(after.bindingFallbacks.mismatches).toHaveLength(1);
  });

  it('refuses an edited record, a record from another file and a tooLarge result, writing nothing', async () => {
    const root = tempRoot();
    const before = onDisk(root);
    const record = await sweep([badNode('10:2', 'Size=md')]);
    record.mismatches = [];
    expect(() => ingestFallbacks({ root, from: saved(root, record) })).toThrow(/checksum/);
    const elsewhere = await sweep([]);
    elsewhere.file = 'SOMEOTHERFILE';
    elsewhere.checksum = hdsChecksum(
      JSON.stringify(
        Object.fromEntries(Object.entries(elsewhere).filter(([k]) => k !== 'checksum')),
      ),
    );
    expect(() => ingestFallbacks({ root, from: saved(root, elsewhere) })).toThrow(
      /not the HDS library/,
    );
    const large = await hdsReadFallbacks(document(), { ...OPTIONS, maxChars: 200 });
    expect(() => ingestFallbacks({ root, from: saved(root, large) })).toThrow(/does not page/);
    expect(() => ingestFallbacks({ root, from: saved(root, { format: 'other' }) })).toThrow(
      /not a bound-colour fallback record/,
    );
    expect(onDisk(root)).toBe(before);
  });

  it('survives a later snapshot ingest that carries no record (a receipt, a diff, snapshot.js)', async () => {
    const root = tempRoot();
    ingestFallbacks({ root, from: saved(root, await sweep([badNode('10:2', 'Size=md')])) });
    const text = serializeSnapshotFile({
      checksum: committed.checksum,
      snapshot: committed.snapshot,
    });
    ingestSnapshot({ root, text });
    expect(parseSnapshotFile(onDisk(root)).bindingFallbacks.mismatches).toHaveLength(1);
  });

  it('refuses a snapshot file whose record was edited by hand', async () => {
    const record = await sweep([badNode('10:2', 'Size=md')]);
    record.nodes += 1;
    expect(() =>
      parseSnapshotFile(serializeSnapshotFile({ ...committed, bindingFallbacks: record })),
    ).toThrow(/does not match its checksum/);
  });
});

describe('pnpm check:figma-fallbacks', () => {
  it('passes when the sweep recorded no mismatch', async () => {
    const root = tempRoot({ ...committed, bindingFallbacks: await sweep([goodNode('10:2')]) });
    const { exitCode, output } = runFallbackCheck({ root });
    expect(exitCode).toBe(0);
    expect(output).toMatch(/^✓/);
  });

  it('fails when a mismatch is recorded, naming the node and the fix', async () => {
    const root = tempRoot({
      ...committed,
      bindingFallbacks: await sweep([badNode('10:2', 'Size=md')]),
    });
    const { exitCode, output } = runFallbackCheck({ root });
    expect(exitCode).toBe(1);
    expect(output).toContain('Size=md (10:2) on page "Kbd"');
    expect(output).toContain('effect bound to color/border/strong stores raw #00000040');
    expect(output).toContain(
      "set that effect's raw colour to #cbd5e1ff (the variable's value) and keep the binding",
    );
  });

  it('warns once and passes on a snapshot that predates the key', () => {
    const { exitCode, output } = runFallbackCheck({ root: tempRoot() });
    expect(exitCode).toBe(0);
    expect(output).toMatch(/not recorded/);
    expect(output.split('\n')).toHaveLength(1);
  });

  it('passes with a notice when there is no snapshot at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'fallbacks-none-'));
    const { exitCode, output } = runFallbackCheck({ root });
    expect(exitCode).toBe(0);
    expect(output).toMatch(/no Figma snapshot yet/);
  });

  it('fails on a snapshot that does not verify', () => {
    const root = tempRoot();
    writeFileSync(join(root, 'figma', 'snapshot.json'), '{"checksum":"00000000","snapshot":{}}');
    expect(runFallbackCheck({ root }).exitCode).toBe(1);
  });

  it('passes on the committed snapshot, with the not-recorded warning until a sweep is ingested', () => {
    const { exitCode } = runFallbackCheck({ root: REPO });
    expect(exitCode).toBe(0);
  });
});
