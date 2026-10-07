/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The receipt channel (hds#417, hds#397 C2): after a verified Sync the plugin
 * writes the snapshot into the file as receipt pages, an agent reads them with
 * figma/push/use-figma/receipt.js through use_figma, and
 * `pnpm figma:snapshot --from-receipt` rebuilds figma/snapshot.json from them.
 * No Download JSON.
 *
 * Seams: the generated files exactly as `pnpm figma:push` writes them to a
 * temporary repo root (the Sync and promote plugins, receipt.js), run in V8
 * contexts against an in-memory Figma file (helpers/fake-figma.mjs); the
 * ingest and drift commands as functions on that root. Nothing here reaches a
 * network or Figma.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import vm from 'vm';
import { gunzipSync } from 'zlib';
import { parse } from 'acorn';
import { hdsChecksum, hdsRunPush, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPushPayload } from '../lib/figma-scripts.mjs';
import { applySnapshotDelta } from '../lib/figma-snapshot-delta.mjs';
import { hdsSyncStamp } from '../lib/figma-sync-runtime.mjs';
import { serializeSnapshotFile } from '../lib/figma-snapshot.mjs';
import { planAgainstSnapshot, writePushArtifacts, writeSyncBundle } from '../figma-push.mjs';
import { ingestReceipt } from '../figma-snapshot.mjs';
import { runDriftCheck } from '../check-figma-drift.mjs';
import { loadFigmaInputs } from '../lib/figma-inputs.mjs';
import { FIXTURE_TOKENS_PATH, fixtureModel, newFixtureFile } from './helpers/figma-fixture.mjs';
import { runSyncPlugin, serve } from './helpers/sync-plugin.mjs';

const LINKS = Object.freeze({
  storybookUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  stagingFileKey: 'STAGINGKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  stagingFileName: 'HDS Tokens & Components (Copy)',
});
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const NOTHING_LINE = 'updated 0 · created 0 · deleted 0';
const PAGE_CHARS = 15000;

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});

const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-receipt-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(LINKS, null, 2));
  return root;
};
const stagingFile = () => {
  const figma = newFixtureFile({ fileName: LINKS.stagingFileName });
  figma.fileKey = LINKS.stagingFileKey;
  return figma;
};
const rootData = (figma, key) => figma.root.getSharedPluginData('hirobius', key);
const setRootData = (figma, key, value) => figma.root.setSharedPluginData('hirobius', key, value);
const snapshotPath = (root) => join(root, 'figma', 'snapshot.json');
const commitSnapshot = async (root, figma) =>
  writeFileSync(snapshotPath(root), serializeSnapshotFile(await hdsRunSnapshot(figma)));
const readFiles = (dir) =>
  Object.fromEntries(
    ['manifest.json', 'code.js', 'ui.html'].map((name) => [
      name,
      readFileSync(join(dir, name), 'utf8'),
    ]),
  );
const pushModel = async (figma) => {
  const { payload, checksum } = buildPushPayload(fixtureModel());
  await hdsRunPush(figma, payload, checksum);
};
const removeVariable = async (figma, name) =>
  (await figma.variables.getLocalVariablesAsync()).find((v) => v.name === name).remove();

/**
 * A repo root and a staging file. `base` decides what main has committed as
 * figma/snapshot.json before the Sync: 'edited' (the model pushed, then one
 * variable removed and one description changed in Figma), 'empty' (a snapshot
 * of the empty file) or null (none). Then `pnpm figma:push` writes the
 * carriers, the deploy writes the bundle, and Adrian runs Sync.
 */
async function synced({ base = 'edited', compression = true } = {}) {
  const root = tempRoot();
  const figma = stagingFile();
  if (base === 'edited') {
    await pushModel(figma);
    await removeVariable(figma, 'ring');
    (await figma.variables.getLocalVariablesAsync())[0].description = 'Edited in Figma.';
  }
  if (base !== null) await commitSnapshot(root, figma);
  const outDir = join(root, 'figma', 'push');
  writePushArtifacts({ root, outDir });
  const plugin = readFiles(join(outDir, 'plugin'));
  const { bundle } = writeSyncBundle({ root, out: join(root, 'bundle.json'), commit: COMMIT });
  const before = figma.writes.length;
  const sync = await runSyncPlugin(plugin, 'sync', figma, { fetch: serve(bundle), compression });
  expect(sync.ok, sync.error).toBe(true);
  return {
    root,
    figma,
    bundle,
    sync,
    writes: figma.writes.slice(before),
    plugin,
    promote: readFiles(join(outDir, 'promote')),
    receiptScript: readFileSync(join(outDir, 'use-figma', 'receipt.js'), 'utf8'),
    head: () => JSON.parse(rootData(figma, 'syncReceipt')),
    page: (i) => rootData(figma, `syncSnapshot.${i}`),
  };
}

/** Runs receipt.js for page `page` the way use_figma does: async, top-level return, `figma` in scope. */
async function runReceipt(script, figma, page = 0) {
  const code = script.replace(/^const PAGE = 0;$/m, `const PAGE = ${page};`);
  expect(code.includes(`const PAGE = ${page};`)).toBe(true);
  const result = await vm.runInNewContext(`(async () => {\n${code}\n})()`, { figma });
  return JSON.parse(JSON.stringify(result));
}

/** Reads every page with receipt.js and saves each answer to a file, as an agent does. */
async function collect({ root, figma, receiptScript }, tag = 'r') {
  const first = await runReceipt(receiptScript, figma, 0);
  const reads = [first];
  for (let page = 1; page < JSON.parse(first.head).pages; page++) {
    reads.push(await runReceipt(receiptScript, figma, page));
  }
  return reads.map((read, i) => {
    const path = join(root, `${tag}-${i}.json`);
    writeFileSync(path, JSON.stringify(read));
    return path;
  });
}
const saveReads = (root, reads, tag = 'edited') =>
  reads.map((read, i) => {
    const path = join(root, `${tag}-${i}.json`);
    writeFileSync(path, JSON.stringify(read));
    return path;
  });
const loadReads = (paths) => paths.map((path) => JSON.parse(readFileSync(path, 'utf8')));

/** The rebuilt snapshot, from the pages alone and the base the head names. */
function rebuildFromPages(s) {
  const head = s.head();
  let text = '';
  for (let i = 0; i < head.pages; i++) text += s.page(i);
  expect(hdsChecksum(text)).toBe(head.sum);
  const body = JSON.parse(
    head.format === 'gzip' ? gunzipSync(Buffer.from(text, 'base64')).toString('utf8') : text,
  );
  return { head, text, body };
}

// ── Sync writes the pages ────────────────────────────────────────────────────
describe('Sync writes the snapshot into the file as receipt pages', () => {
  it('a small change: the delta against the bundle base, one raw JSON page, then the head', async () => {
    const s = await synced();
    const head = s.head();
    expect(head).toMatchObject({
      v: 1,
      commit: COMMIT,
      post: s.sync.result.checksum,
      base: s.bundle.base.checksum,
      format: 'json',
      pages: 1,
      lastPush: JSON.parse(rootData(s.figma, 'lastPush')),
    });
    expect(head.pushedAt).toBe(head.lastPush.pushedAt);
    expect(JSON.stringify(head).length).toBeLessThanOrEqual(1024);
    const { body } = rebuildFromPages(s);
    expect('full' in body).toBe(false);
    const post = applySnapshotDelta(s.bundle.base.snapshot, body);
    expect(hdsChecksum(JSON.stringify(post))).toBe(head.post);
    // Pages first, head last: a head never points at a page not written yet.
    expect(s.writes.slice(-2)).toEqual([
      'root.pluginData:syncSnapshot.0',
      'root.pluginData:syncReceipt',
    ]);
    expect(s.sync.notes.join('\n')).toMatch(/receipt\.js/);
  });

  it("a delta over 12,000 chars is gzipped by the window's CompressionStream: one page", async () => {
    const s = await synced({ base: 'empty' });
    expect(s.sync.posted).toContain('gzip');
    const { head, body } = rebuildFromPages(s);
    expect(head).toMatchObject({ format: 'gzip', pages: 1 });
    expect(s.page(0).length).toBeLessThanOrEqual(PAGE_CHARS);
    expect(JSON.stringify(body).length).toBeGreaterThan(12000);
    const post = applySnapshotDelta(s.bundle.base.snapshot, body);
    expect(hdsChecksum(JSON.stringify(post))).toBe(head.post);
  });

  it('without CompressionStream in the window: raw pages of at most 15,000 chars', async () => {
    const s = await synced({ base: 'empty', compression: false });
    const { head, text } = rebuildFromPages(s);
    expect(head.format).toBe('json');
    expect(head.pages).toBe(Math.ceil(text.length / PAGE_CHARS));
    expect(head.pages).toBeGreaterThan(1);
    for (let i = 0; i < head.pages; i++) expect(s.page(i).length).toBeLessThanOrEqual(PAGE_CHARS);
  });

  it('with no committed snapshot (base unknown): the full snapshot', async () => {
    const s = await synced({ base: null });
    const { head, body } = rebuildFromPages(s);
    expect(head.base).toBeNull();
    expect(hdsChecksum(JSON.stringify(applySnapshotDelta(null, body)))).toBe(head.post);
  });

  it('a later Sync that needs fewer pages clears the pages left over', async () => {
    const s = await synced({ base: 'empty', compression: false });
    const pagesBefore = s.head().pages;
    expect(pagesBefore).toBeGreaterThan(1);
    await removeVariable(s.figma, 'ring');
    const again = await runSyncPlugin(s.plugin, 'sync', s.figma, { fetch: serve(s.bundle) });
    expect(again.ok, again.error).toBe(true);
    expect(s.head().pages).toBe(1);
    for (let i = 1; i < pagesBefore; i++) expect(s.page(i)).toBe('');
  });

  it('a Sync that changed nothing rewrites nothing, unless main committed a new base', async () => {
    const s = await synced();
    const before = s.figma.writes.length;
    const same = await runSyncPlugin(s.plugin, 'sync', s.figma, { fetch: serve(s.bundle) });
    expect(same.ok, same.error).toBe(true);
    expect(s.figma.writes.slice(before)).toEqual([]);

    // Main commits the snapshot the receipt carried; the deploy's bundle names it as base.
    await commitSnapshot(s.root, s.figma);
    const { bundle } = writeSyncBundle({
      root: s.root,
      out: join(s.root, 'b2.json'),
      commit: COMMIT,
    });
    const rebased = await runSyncPlugin(s.plugin, 'sync', s.figma, { fetch: serve(bundle) });
    expect(rebased.ok, rebased.error).toBe(true);
    expect(s.head().base).toBe(bundle.base.checksum);
  });

  it('when Figma does not keep a page, the Sync still reports its push and leaves no receipt', async () => {
    const s = await synced();
    const set = s.figma.root.setSharedPluginData;
    s.figma.root.setSharedPluginData = (namespace, key, value) =>
      set(namespace, key, key.startsWith('syncSnapshot.') ? String(value).slice(0, 10) : value);
    await removeVariable(s.figma, 'ring');
    const again = await runSyncPlugin(s.plugin, 'sync', s.figma, { fetch: serve(s.bundle) });
    expect(again.ok, again.error).toBe(true);
    expect(again.title).toMatch(/created 1/);
    expect(again.notes.join('\n')).toMatch(/Receipt not written.*Download JSON/s);
    expect(rootData(s.figma, 'syncReceipt')).toBe('');
  });

  it('a head naming more pages than the 64 it may have is not trusted: Sync reads no page past 63 and rewrites it', async () => {
    const s = await synced();
    const head = s.head();
    // A malformed head (hand-edited, or written by something else) must not keep Sync reading.
    setRootData(s.figma, 'syncReceipt', JSON.stringify({ ...head, pages: 100000 }));
    const read = [];
    const get = s.figma.root.getSharedPluginData;
    s.figma.root.getSharedPluginData = (namespace, key) => {
      if (key.startsWith('syncSnapshot.')) read.push(Number(key.slice('syncSnapshot.'.length)));
      return get(namespace, key);
    };
    const again = await runSyncPlugin(s.plugin, 'sync', s.figma, { fetch: serve(s.bundle) });
    expect(again.ok, again.error).toBe(true);
    expect(read.filter((page) => page >= 64)).toEqual([]);
    expect(again.notes.join('\n')).toMatch(/Receipt written/);
    expect(s.head()).toMatchObject({ pages: 1, base: head.base });
  });

  it('never cuts a character in two: each page ends on a code-point boundary and the pages join back', async () => {
    // Raw text full of astral characters (an emoji in a description), cut into
    // tiny pages so every offset lands on a pair at some page size.
    const snapshot = {
      takenAt: '2026-10-01T00:00:00.000Z',
      lastPush: null,
      collections: [],
      textStyles: [],
      effectStyles: [{ id: 'S:1,', name: 'elevation/🎨', description: 'x🎨y🎨🎨z😀' }],
    };
    const snap = { snapshot, checksum: hdsChecksum(JSON.stringify(snapshot)) };
    const body = JSON.stringify({ full: snapshot });
    const pairAt = (text, i) => /[\uD800-\uDBFF]/.test(text[i]);
    for (let pageChars = 2; pageChars <= 24; pageChars++) {
      const figma = stagingFile();
      const sync = { rawChars: Infinity, pageChars, maxPages: 10000, gzipTimeoutMs: 1 };
      const head = await hdsSyncStamp(
        figma,
        { commit: COMMIT, modelHash: 'abcdef12', base: null },
        { line: NOTHING_LINE },
        snap,
        'build123',
        sync,
        () => {
          throw new Error('no base, so no delta');
        },
      );
      const pages = Array.from({ length: head.pages }, (_, i) =>
        rootData(figma, `syncSnapshot.${i}`),
      );
      expect(pages.join(''), `pages of ${pageChars}`).toBe(body);
      for (const page of pages) {
        expect(page.length, `pages of ${pageChars}`).toBeLessThanOrEqual(pageChars);
        expect(pairAt(page, page.length - 1), `pages of ${pageChars}: ${page}`).toBe(false);
      }
    }
  });
});

// ── receipt.js ───────────────────────────────────────────────────────────────
describe('figma/push/use-figma/receipt.js', () => {
  /** A file whose every property read is logged: what the script touched before it refused. */
  const watched = (fileKey) => {
    const figma = stagingFile();
    figma.fileKey = fileKey;
    const reads = [];
    const proxy = new Proxy(figma, {
      get(target, prop) {
        reads.push(String(prop));
        return Reflect.get(target, prop);
      },
    });
    return { proxy, reads, figma };
  };

  it('is at most 1,500 chars, and its first statement refuses any file but staging', async () => {
    const { receiptScript } = await synced();
    expect(receiptScript.length).toBeLessThanOrEqual(1500);
    const ast = parse(receiptScript, {
      ecmaVersion: 2020,
      sourceType: 'script',
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
    const first = receiptScript.slice(ast.body[0].start, ast.body[0].end);
    expect(ast.body[0].type).toBe('IfStatement');
    expect(first).toContain(`figma.fileKey !== '${LINKS.stagingFileKey}'`);
    expect(first).toContain(`figma.fileKey === '${LINKS.libraryFileKey}'`);
    expect(first).toMatch(/throw new Error/);
  });

  it('reads nothing but figma.fileKey in the library, in a file with no key, or in any other file', async () => {
    const { receiptScript } = await synced();
    for (const key of [LINKS.libraryFileKey, null, undefined, 'SOMEOTHERFILE000000000']) {
      const { proxy, reads, figma } = watched(key);
      setRootData(figma, 'syncReceipt', '{"secret":true}');
      await expect(runReceipt(receiptScript, proxy)).rejects.toThrow(
        /not the HDS staging file.*Nothing was read/,
      );
      expect(reads, String(key)).toEqual(['fileKey']);
      expect(figma.writes.filter((w) => !w.includes('syncReceipt'))).toEqual([]);
    }
  });

  it('in staging: returns the head, page i and the live fingerprint, and writes nothing', async () => {
    const s = await synced({ base: 'empty', compression: false });
    const before = s.figma.writes.length;
    const read = await runReceipt(s.receiptScript, s.figma, 1);
    expect(read).toEqual({
      file: LINKS.stagingFileKey,
      page: 1,
      head: rootData(s.figma, 'syncReceipt'),
      text: s.page(1),
      live: {
        lastPush: rootData(s.figma, 'lastPush'),
        ...s.head().counts,
      },
    });
    expect(s.figma.writes.slice(before)).toEqual([]);
    // use_figma returns at most 20 KB: a full raw page plus the head must fit.
    expect(JSON.stringify(read).length).toBeLessThanOrEqual(20000);
  });
});

// ── --from-receipt ───────────────────────────────────────────────────────────
describe('pnpm figma:snapshot --from-receipt', () => {
  for (const [label, options] of [
    ['a raw JSON delta (1 page)', {}],
    ['a gzipped delta', { base: 'empty' }],
    ['raw pages without CompressionStream', { base: 'empty', compression: false }],
    ['a full snapshot (no base committed)', { base: null }],
  ]) {
    it(`e2e, ${label}: Sync → receipt.js → --from-receipt → drift 0 and a plan of 0 · 0 · 0`, async () => {
      const s = await synced(options);
      const files = await collect(s);
      const { checksum, outPath } = ingestReceipt({ root: s.root, files });
      expect(outPath).toBe(snapshotPath(s.root));
      expect(checksum).toBe(s.head().post);
      expect(readFileSync(outPath, 'utf8')).toBe(serializeSnapshotFile(s.sync.result));

      // The agent's commit gate: plain drift exits 0 AND the plan is 0 · 0 · 0.
      expect(runDriftCheck({ root: s.root })).toMatchObject({ exitCode: 0 });
      const { model, renames } = loadFigmaInputs(s.root);
      const snapshotFile = JSON.parse(readFileSync(outPath, 'utf8'));
      expect(planAgainstSnapshot({ model, renames, snapshotFile }).line).toBe(NOTHING_LINE);
    });
  }

  /** Expects ingest to refuse with `pattern`, leaving the committed snapshot as it was. */
  const refuses = (root, files, pattern) => {
    const committed = existsSync(snapshotPath(root))
      ? readFileSync(snapshotPath(root), 'utf8')
      : null;
    expect(() => ingestReceipt({ root, files })).toThrow(pattern);
    const now = existsSync(snapshotPath(root)) ? readFileSync(snapshotPath(root), 'utf8') : null;
    expect(now).toBe(committed);
  };

  it('refuses a receipt against another base than the committed snapshot', async () => {
    const s = await synced();
    const files = await collect(s);
    // Main moved on: another snapshot is committed now.
    const other = stagingFile();
    await pushModel(other);
    await commitSnapshot(s.root, other);
    refuses(s.root, files, /base.*committed figma\/snapshot\.json.*Sync again/s);
  });

  it('refuses a receipt whose pages do not rebuild its post checksum', async () => {
    const s = await synced();
    const reads = loadReads(await collect(s));
    const head = JSON.parse(reads[0].head);
    head.post = 'deadbeef';
    reads.forEach((read) => (read.head = JSON.stringify(head)));
    refuses(s.root, saveReads(s.root, reads), /post checksum deadbeef/);
  });

  it('refuses when a page is missing, naming it and how to read it', async () => {
    const s = await synced({ base: 'empty', compression: false });
    const files = await collect(s);
    expect(files.length).toBeGreaterThan(1);
    refuses(s.root, files.slice(0, 1), /page 1 .*missing.*const PAGE = 1/s);
  });

  it('refuses a read from any file but staging', async () => {
    const s = await synced();
    for (const file of [LINKS.libraryFileKey, null, 'SOMEOTHERFILE000000000']) {
      const reads = loadReads(await collect(s));
      reads[0].file = file;
      refuses(s.root, saveReads(s.root, reads), /staging/);
    }
  });

  it('refuses a stale receipt: the live file has another variable count than the receipt', async () => {
    const s = await synced();
    // Something else wrote to staging after the Sync (an agent drawing session, a hand edit).
    const [collection] = await s.figma.variables.getLocalVariableCollectionsAsync();
    s.figma.variables.createVariable('hand/made', collection, 'FLOAT');
    refuses(s.root, await collect(s), /stale.*variables 58 in the receipt, 59 live/s);
  });

  it("refuses a stale receipt: the live lastPush is not the receipt's", async () => {
    const s = await synced();
    // Another push (the promote plugin, a use_figma script) stamped staging after the Sync.
    setRootData(
      s.figma,
      'lastPush',
      JSON.stringify({ modelHash: 'abcdef12', pushedAt: '2026-10-02T00:00:00.000Z', scope: null }),
    );
    refuses(s.root, await collect(s), /stale.*lastPush/s);
  });

  it('refuses a file with no receipt, naming Sync', async () => {
    const s = await synced();
    setRootData(s.figma, 'syncReceipt', '');
    refuses(s.root, await saveReadsOf(s), /no sync receipt.*Sync/is);
  });

  /** One receipt.js read of page 0, saved. */
  const saveReadsOf = async (s) =>
    saveReads(s.root, [await runReceipt(s.receiptScript, s.figma, 0)], 'one');
});

// ── Every other writer clears the receipt ────────────────────────────────────
describe('the promote plugin clears the Sync receipt', () => {
  const runPromote = async (files, command, figma) => {
    const posted = [];
    figma.command = command;
    figma.showUI = () => {};
    figma.closePlugin = () => {};
    figma.ui = { postMessage: (message) => posted.push(message), onmessage: null };
    vm.runInNewContext(files['code.js'], { figma, __html__: files['ui.html'] });
    for (let i = 0; i < 400 && posted.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
    return JSON.parse(JSON.stringify(posted[0]));
  };
  /** The receipt's keys that hold anything: the head and pages 0 … pages - 1. */
  const receiptKeys = (figma, pages) =>
    ['syncReceipt', ...Array.from({ length: pages }, (_, i) => `syncSnapshot.${i}`)].filter((key) =>
      rootData(figma, key),
    );

  for (const command of ['push', 'snapshot']) {
    it(`${command} clears syncReceipt and every page`, async () => {
      const s = await synced({ base: 'empty', compression: false });
      const { pages } = s.head();
      expect(pages).toBeGreaterThan(1);
      expect(receiptKeys(s.figma, pages)).toHaveLength(1 + pages);
      // A page an earlier, longer receipt left behind, at the last index Sync may write.
      setRootData(s.figma, 'syncSnapshot.63', 'left over');
      const result = await runPromote(s.promote, command, s.figma);
      expect(result.ok, result.error).toBe(true);
      expect(receiptKeys(s.figma, 64)).toEqual([]);
    });
  }

  it('Plan (dry run) leaves the receipt, and a file with no receipt gets no extra write', async () => {
    const s = await synced();
    const plan = await runPromote(s.promote, 'plan', s.figma);
    expect(plan.ok, plan.error).toBe(true);
    expect(rootData(s.figma, 'syncReceipt')).not.toBe('');

    const fresh = stagingFile();
    const before = fresh.writes.length;
    expect((await runPromote(s.promote, 'snapshot', fresh)).ok).toBe(true);
    expect(fresh.writes.slice(before)).toEqual([]);
  });
});
