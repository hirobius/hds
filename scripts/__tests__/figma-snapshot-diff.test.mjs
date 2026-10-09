/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds snapshot-diff: an agent re-bases figma/snapshot.json after the library
 * changed outside the repo, without moving the ~165 KB snapshot through a
 * use_figma result (about 20 KB fits). snapshot-diff.js embeds a fingerprint
 * of the committed snapshot, returns only the records that differ, and
 * `pnpm figma:snapshot --from-diff` rebuilds the live snapshot and checks it
 * against the live checksum the script returned.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { hdsChecksum, hdsVerifyRuntime } from '../lib/figma-runtime.mjs';
import { hdsAgentReadState } from '../lib/figma-agent-runtime.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { buildUseFigmaSnapshotDiffScript } from '../lib/figma-scripts.mjs';
import { ingestDiff } from '../figma-snapshot.mjs';
import { writePushArtifacts } from '../figma-push.mjs';
import { seededFakeFigma } from './helpers/fake-figma.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const committed = parseSnapshotFile(readFileSync(join(REPO, 'figma', 'snapshot.json'), 'utf8'));
const LINKS = {
  libraryFileKey: committed.snapshot.file.key,
  libraryFileName: committed.snapshot.file.name,
  storybookUrl: 'https://example.test',
  retiredFiles: [],
};

/** A library file that holds the committed snapshot, read the way use_figma reads it. */
function library() {
  const figma = seededFakeFigma(committed.snapshot);
  figma.fileKey = LINKS.libraryFileKey;
  figma.useFigma();
  return figma;
}
const script = (snapshotFile = committed) => buildUseFigmaSnapshotDiffScript(LINKS, snapshotFile);

/** Runs a use_figma script the way use_figma does: async, top-level await and return, `figma` in scope. */
async function run(text, figma) {
  const result = await vm.runInNewContext(`(async () => {\n${text}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
}

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'snapdiff-'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'snapshot.json'), serializeSnapshotFile(committed));
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify({ ...LINKS, retiredFiles: [] }));
  return root;
}
const savedAt = (root, diff) => {
  const path = join(root, 'diff.json');
  writeFileSync(path, JSON.stringify(diff));
  return path;
};
const onDisk = (root) => readFileSync(join(root, 'figma', 'snapshot.json'), 'utf8');

/** The library as the committed snapshot's author would read it now, stamped with the diff's takenAt. */
async function freshRead(figma, diff) {
  const fresh = await hdsAgentReadState(figma, committed.snapshot.file);
  fresh.takenAt = diff.takenAt;
  return fresh;
}

/** Runs the script, rebuilds with --from-diff, and checks the rebuilt file is the library's fresh read. */
async function rebaseAndCompare(figma) {
  const diff = await run(script(), figma);
  const root = tempRoot();
  const result = ingestDiff({ root, from: savedAt(root, diff) });
  const fresh = await freshRead(figma, diff);
  expect(result.checksum).toBe(hdsChecksum(JSON.stringify(fresh)));
  expect(result.checksum).toBe(diff.live);
  expect(JSON.parse(onDisk(root))).toEqual({ checksum: diff.live, snapshot: fresh });
  expect(parseSnapshotFile(onDisk(root)).snapshot).toEqual(fresh);
  return { diff, fresh, root };
}

const variablesOf = async (figma) => figma.variables.getLocalVariablesAsync();

describe('snapshot-diff.js against the library', () => {
  it('returns almost nothing when only the clock moved', async () => {
    const diff = await run(script(), library());
    expect(diff.base).toBe(committed.checksum);
    expect(diff.changed).toEqual({
      collections: [],
      variables: [],
      textStyles: [],
      effectStyles: [],
    });
    expect(diff.removed).toEqual([]);
    expect(diff.top).toBeUndefined();
    expect(JSON.stringify(diff).length).toBeLessThan(2000);
    await rebaseAndCompare(library());
  });

  it('carries one changed variable description, decoded the way delta.js reads it', async () => {
    const figma = library();
    const [first] = await variablesOf(figma);
    first.description = 'Edited "outside" the repo & <saved> by hand';
    const { diff } = await rebaseAndCompare(figma);
    expect(diff.changed.variables.map((e) => e.v.id)).toEqual([first.id]);
    expect(diff.changed.variables[0].v.description).toBe(
      'Edited "outside" the repo & <saved> by hand',
    );
    expect(diff.changed.collections).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('carries an added variable in its collection, in name order', async () => {
    const figma = library();
    const [home] = await figma.variables.getLocalVariableCollectionsAsync();
    const added = figma.variables.createVariable('aaa/first-in-order', home, 'FLOAT');
    added.setValueForMode(home.modes[0].modeId, 4);
    const { diff, fresh } = await rebaseAndCompare(figma);
    expect(diff.changed.variables.map((e) => e.v.id)).toEqual([added.id]);
    expect(diff.changed.variables[0].c).toBe(home.id);
    expect(fresh.collections[0].variables[0].name).toBe('aaa/first-in-order');
  });

  it('carries a renamed variable to its new place in the sort order', async () => {
    const figma = library();
    const [first] = await variablesOf(figma);
    first.name = 'zzz/renamed-last';
    await rebaseAndCompare(figma);
  });

  it('lists a removed text style by id', async () => {
    const figma = library();
    const [style] = await figma.getLocalTextStylesAsync();
    const id = style.id;
    style.remove();
    const { diff, fresh } = await rebaseAndCompare(figma);
    expect(diff.removed).toEqual([id]);
    expect(fresh.textStyles.some((s) => s.id === id)).toBe(false);
    expect(diff.changed.textStyles).toEqual([]);
  });

  it('carries a removed variable and a changed effect style', async () => {
    const figma = library();
    const [gone] = await variablesOf(figma);
    gone.remove();
    const [effect] = await figma.getLocalEffectStylesAsync();
    effect.description = 'rewritten';
    const { diff } = await rebaseAndCompare(figma);
    expect(diff.removed).toContain(gone.id);
    expect(diff.changed.effectStyles.map((s) => s.id)).toEqual([effect.id]);
  });

  it('carries a changed top-level lastPush', async () => {
    const figma = library();
    figma.root.setSharedPluginData(
      'hirobius',
      'lastPush',
      JSON.stringify({
        commit: 'abc1234',
        modelHash: 'deadbeef',
        pushedAt: '2026-10-09T00:00:00.000Z',
        scope: 'all',
      }),
    );
    const { diff, fresh } = await rebaseAndCompare(figma);
    expect(diff.top.lastPush.commit).toBe('abc1234');
    expect(fresh.lastPush.commit).toBe('abc1234');
    expect(diff.changed.variables).toEqual([]);
  });

  it('carries a collection header change without its variables', async () => {
    const figma = library();
    const [home] = await figma.variables.getLocalVariableCollectionsAsync();
    home.hiddenFromPublishing = !home.hiddenFromPublishing;
    const { diff } = await rebaseAndCompare(figma);
    expect(diff.changed.collections.map((c) => c.id)).toEqual([home.id]);
    expect(diff.changed.collections[0]).not.toHaveProperty('variables');
  });

  it('takes takenAt from the diff: the live checksum covers the snapshot stamped with it', async () => {
    const figma = library();
    const diff = await run(script(), figma);
    expect(diff.takenAt).not.toBe(committed.snapshot.takenAt);
    const fresh = await freshRead(figma, diff);
    expect(hdsChecksum(JSON.stringify(fresh))).toBe(diff.live);
  });

  it('returns tooLarge, not a partial diff, when the change would not fit a use_figma result', async () => {
    const figma = library();
    for (const v of await variablesOf(figma)) v.description = `rewritten ${'x'.repeat(60)}`;
    const diff = await run(script(), figma);
    expect(diff.tooLarge).toBe(true);
    expect(diff.changed).toBeUndefined();
    expect(JSON.stringify(diff).length).toBeLessThan(3000);
    expect(diff.next).toMatch(/Sync plugin/);
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, diff) })).toThrow(/Sync plugin/);
    expect(onDisk(root)).toBe(serializeSnapshotFile(committed));
  });
});

describe('the guards', () => {
  it('refuses any file but the library, before it reads anything', async () => {
    const figma = library();
    figma.fileKey = 'SOMEOTHERFILE';
    await expect(run(script(), figma)).rejects.toThrow(/not the HDS library/);
  });

  it('refuses a fingerprint changed after it was generated', async () => {
    const text = script().replace(
      /"VariableID:[^"]+":"[0-9a-f]{8}"/,
      '"VariableID:0:0":"00000000"',
    );
    await expect(run(text, library())).rejects.toThrow(/fingerprint/i);
  });

  it('refuses a diff whose live checksum was forged, writing nothing', async () => {
    const figma = library();
    const [first] = await variablesOf(figma);
    first.description = 'changed';
    const diff = await run(script(), figma);
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, { ...diff, live: '00000000' }) })).toThrow(
      /does not match/,
    );
    expect(onDisk(root)).toBe(serializeSnapshotFile(committed));
  });

  it('refuses a diff with a record changed in transit, writing nothing', async () => {
    const figma = library();
    const [first] = await variablesOf(figma);
    first.description = 'changed';
    const diff = await run(script(), figma);
    diff.changed.variables[0].v.description = 'tampered';
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, diff) })).toThrow(/does not match/);
    expect(onDisk(root)).toBe(serializeSnapshotFile(committed));
  });

  it('refuses a diff taken against another snapshot than the committed one, writing nothing', async () => {
    const diff = await run(script(), library());
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, { ...diff, base: '12345678' }) })).toThrow(
      /committed figma\/snapshot\.json/,
    );
    expect(onDisk(root)).toBe(serializeSnapshotFile(committed));
  });

  it('refuses a diff taken in another file', async () => {
    const diff = await run(script(), library());
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, { ...diff, file: 'OTHER' }) })).toThrow(
      /not the HDS library/,
    );
  });

  it('refuses something that is not a diff', () => {
    const root = tempRoot();
    expect(() => ingestDiff({ root, from: savedAt(root, { hello: 1 }) })).toThrow(
      /snapshot-diff\.js/,
    );
  });
});

describe('the generated snapshot-diff.js', () => {
  it('fits the 45,000 character budget for the real committed snapshot', () => {
    const size = script().length;
    expect(size).toBeLessThanOrEqual(45000);
  });

  it('carries the same file-key guard as snapshot.js, first', () => {
    expect(script().startsWith(`if (figma.fileKey !== '${LINKS.libraryFileKey}'`)).toBe(true);
  });

  it('is read-only: it carries no function that writes to Figma', () => {
    const text = script();
    for (const write of ['hdsApply', 'hdsRunPush', 'hdsSetKey', 'setSharedPluginData']) {
      expect(text).not.toContain(write);
    }
  });

  /** The use_figma runtime hands String(fn) back re-indented (hds#565). */
  const reindent = (src) =>
    src
      .split('\n')
      .map((line, i) => ' '.repeat((i * 7) % 5) + '\t'.repeat(i % 2) + line.trim())
      .join('\n');

  it('passes hdsVerifyRuntime under re-indentation, and fails when one identifier changes', () => {
    const code = script();
    const ast = parse(code, {
      ecmaVersion: 2020,
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });
    const fns = ast.body.filter((n) => n.type === 'FunctionDeclaration');
    const call = ast.body.find(
      (n) => n.type === 'ExpressionStatement' && n.expression.callee?.name === 'hdsVerifyRuntime',
    );
    const [names, sum] = call.expression.arguments;
    const sources = Object.fromEntries(fns.map((n) => [n.id.name, code.slice(n.start, n.end)]));
    const carried = names.elements.map((e) => e.name);
    expect(carried).toContain('hdsSnapshotDiff');
    expect(() =>
      hdsVerifyRuntime(
        carried.map((n) => ({ toString: () => reindent(sources[n]) })),
        sum.value,
        false,
      ),
    ).not.toThrow();
    expect(() =>
      hdsVerifyRuntime(
        carried.map((n) => ({
          toString: () =>
            n === 'hdsSnapshotDiff' ? sources[n].replace('changed', 'chenged') : sources[n],
        })),
        sum.value,
        false,
      ),
    ).toThrow(/does not match its checksum/);
  });

  it('runs end to end when the whole script is re-indented', async () => {
    const reindented = script()
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    const diff = await run(reindented, library());
    expect(diff.base).toBe(committed.checksum);
  });

  it('is written by pnpm figma:push beside snapshot.js, within budget, for the real repo', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'snapdiff-push-'));
    const { files } = writePushArtifacts({ root: REPO, outDir });
    const written = files.find((f) => f.path === 'use-figma/snapshot-diff.js');
    expect(written).toBeDefined();
    expect(written.bytes).toBeLessThanOrEqual(45000);
    expect(readFileSync(join(outDir, 'use-figma', 'snapshot-diff.js'), 'utf8')).toContain(
      `"base":"${committed.checksum}"`,
    );
  });
});
