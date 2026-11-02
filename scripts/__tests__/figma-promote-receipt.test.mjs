/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The promote plugin's snapshot receipt (hds#397, receipt-channel slice):
 * "Take snapshot" emits one fixed JSON shape under one fixed file name, and
 * `pnpm figma:snapshot --ingest` takes it straight from a known path or an
 * https URL, so nobody hand-copies the JSON.
 *
 * Seams: the promote plugin exactly as buildPromotePlugin writes it, run in a
 * V8 context against an in-memory Figma file; the receipt module's pure
 * functions; ingestSnapshot on a temporary root. Fetch is injected: nothing
 * here reaches a network or Figma.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { hdsChecksum, hdsRunSnapshot } from '../lib/figma-runtime.mjs';
import { buildPromotePlugin } from '../lib/figma-scripts.mjs';
import {
  PROMOTE_RECEIPT_FILE,
  PROMOTE_RECEIPT_KIND,
  promoteReceiptPaths,
  readIngestSource,
  unwrapPromoteReceipt,
} from '../lib/figma-promote-receipt.mjs';
import { ingestSnapshot } from '../figma-snapshot.mjs';
import { fixtureModel, newFixtureFile } from './helpers/figma-fixture.mjs';
import { LINKS, useTempRoots } from './helpers/figma-temp-root.mjs';

const tempRoot = useTempRoots('hds-promote-receipt-');
const libraryFile = () => {
  const figma = newFixtureFile({ fileName: LINKS.libraryFileName });
  figma.fileKey = LINKS.libraryFileKey;
  return figma;
};

async function runSnapshotCommand(figma) {
  const files = buildPromotePlugin(fixtureModel(), { links: LINKS });
  const posted = [];
  figma.command = 'snapshot';
  figma.showUI = () => {};
  figma.closePlugin = () => {};
  figma.ui = { postMessage: (m) => posted.push(m), onmessage: null };
  vm.runInNewContext(files['code.js'], { figma, __html__: files['ui.html'] });
  for (let i = 0; i < 400 && posted.length === 0; i++) await new Promise((r) => setTimeout(r, 5));
  return { files, message: JSON.parse(JSON.stringify(posted[0])) };
}

describe('promote plugin: Take snapshot emits a receipt', () => {
  it('posts the fixed shape under the fixed file name, and keeps networkAccess none', async () => {
    const figma = libraryFile();
    const { files, message } = await runSnapshotCommand(figma);
    expect(message.ok, message.error).toBe(true);
    expect(message.fileName).toBe(PROMOTE_RECEIPT_FILE);
    const receipt = message.result;
    expect(Object.keys(receipt)).toEqual(['kind', 'v', 'fileKey', 'checksum', 'snapshot']);
    expect(receipt.kind).toBe(PROMOTE_RECEIPT_KIND);
    expect(receipt.v).toBe(1);
    expect(receipt.fileKey).toBe(LINKS.libraryFileKey);
    expect(receipt.checksum).toBe(hdsChecksum(JSON.stringify(receipt.snapshot)));
    const direct = await hdsRunSnapshot(libraryFile());
    expect(receipt.snapshot.collections).toEqual(direct.snapshot.collections);
    expect(JSON.parse(files['manifest.json']).networkAccess).toEqual({ allowedDomains: ['none'] });
  });
});

describe('unwrapPromoteReceipt', () => {
  const sync = { libraryFileKey: LINKS.libraryFileKey };
  const receipt = (over = {}) =>
    JSON.stringify({
      kind: PROMOTE_RECEIPT_KIND,
      v: 1,
      fileKey: LINKS.libraryFileKey,
      checksum: 'c',
      snapshot: { x: 1 },
      ...over,
    });

  it('returns the { checksum, snapshot } text of a receipt', () => {
    expect(JSON.parse(unwrapPromoteReceipt(receipt(), sync))).toEqual({
      checksum: 'c',
      snapshot: { x: 1 },
    });
  });

  it('passes a plain snapshot file through unchanged', () => {
    const plain = JSON.stringify({ checksum: 'c', snapshot: {} });
    expect(unwrapPromoteReceipt(plain, sync)).toBe(plain);
  });

  it('refuses another version, or a receipt from a file that is not the library', () => {
    expect(() => unwrapPromoteReceipt(receipt({ v: 2 }), sync)).toThrow(/version 2/);
    expect(() => unwrapPromoteReceipt(receipt({ fileKey: 'other' }), sync)).toThrow(/other/);
    expect(() => unwrapPromoteReceipt(receipt({ fileKey: null }), sync)).toThrow(/no key/);
  });
});

describe('readIngestSource', () => {
  it('with no file, reads the first known path that exists', async () => {
    const root = tempRoot();
    const home = join(root, 'home');
    const [downloads, beside] = promoteReceiptPaths({ root, home });
    expect(downloads).toBe(join(home, 'Downloads', PROMOTE_RECEIPT_FILE));
    expect(beside).toBe(join(root, 'figma', 'push', 'promote', PROMOTE_RECEIPT_FILE));
    mkdirSync(join(root, 'figma', 'push', 'promote'), { recursive: true });
    writeFileSync(beside, 'B');
    expect(await readIngestSource({ root, home })).toEqual({ text: 'B', source: beside });
    mkdirSync(join(home, 'Downloads'), { recursive: true });
    writeFileSync(downloads, 'A');
    expect(await readIngestSource({ root, home })).toEqual({ text: 'A', source: downloads });
  });

  it('with no file and nothing at a known path, names the paths', async () => {
    const root = tempRoot();
    await expect(readIngestSource({ root, home: join(root, 'h') })).rejects.toThrow(
      new RegExp(PROMOTE_RECEIPT_FILE.replace('.', '\\.')),
    );
  });

  it('fetches an https URL, and refuses http', async () => {
    const root = tempRoot();
    const asked = [];
    const fetchText = async (url) => (asked.push(url), 'U');
    const url = 'https://example.com/r.json';
    expect(await readIngestSource({ root, from: url, fetchText })).toEqual({
      text: 'U',
      source: url,
    });
    expect(asked).toEqual([url]);
    await expect(
      readIngestSource({ root, from: 'http://example.com/r.json', fetchText }),
    ).rejects.toThrow(/https/);
  });

  it('reads a named file', async () => {
    const root = tempRoot();
    const path = join(root, 'x.json');
    writeFileSync(path, 'F');
    expect(await readIngestSource({ root, from: path })).toEqual({ text: 'F', source: path });
  });
});

describe('ingestSnapshot takes a receipt', () => {
  it('writes figma/snapshot.json without the receipt wrapper', async () => {
    const root = tempRoot();
    const { message } = await runSnapshotCommand(libraryFile());
    const text = unwrapPromoteReceipt(JSON.stringify(message.result), LINKS);
    const { outPath, checksum } = ingestSnapshot({ root, text });
    expect(existsSync(outPath)).toBe(true);
    const written = JSON.parse(readFileSync(outPath, 'utf8'));
    expect(written.checksum).toBe(checksum);
    expect(written.kind).toBeUndefined();
  });
});
