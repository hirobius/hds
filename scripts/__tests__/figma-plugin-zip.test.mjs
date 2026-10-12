/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * `pnpm figma:push --plugin-zip`: the Sync plugin as a downloadable zip the
 * docs site serves next to sync-bundle.json. The zip must hold exactly the
 * three built plugin files (never the promote plugin) and name the same
 * pluginBuild as the bundle, or Sync refuses the plugin as out of date.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { inflateRawSync } from 'zlib';
import { writePushArtifacts, writePluginZip, writeSyncBundle } from '../figma-push.mjs';
import { FIXTURE_TOKENS_PATH } from './helpers/figma-fixture.mjs';

const LINKS = {
  docsUrl: 'https://hirobius-design-system.vercel.app',
  libraryFileKey: 'LIBRARYKEY000000000000',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: 'RETIREDKEY000000000000', fileName: 'HDS Tokens & Components (old)' }],
};

let dirs = [];
afterEach(() => {
  dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  dirs = [];
});
const tempRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'hds-plugin-zip-'));
  dirs.push(root);
  copyFileSync(FIXTURE_TOKENS_PATH, join(root, 'hirobius.tokens.json'));
  mkdirSync(join(root, 'figma'), { recursive: true });
  writeFileSync(join(root, 'figma', 'links.json'), JSON.stringify(LINKS, null, 2));
  return root;
};

/** Reads a zip through its central directory: { name -> Buffer }. Independent of the writer. */
function readZip(buf) {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  expect(eocd).toBeGreaterThanOrEqual(0);
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const entries = {};
  for (let i = 0; i < count; i += 1) {
    expect(buf.readUInt32LE(at)).toBe(0x02014b50);
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    entries[name] = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

describe('pnpm figma:push --plugin-zip', () => {
  it('zips exactly the three Sync plugin files under hds-tokens-sync/, byte for byte', () => {
    const root = tempRoot();
    const outDir = join(root, 'figma', 'push');
    writePushArtifacts({ root, outDir });
    const out = join(root, 'out', 'figma', 'hds-tokens-sync.zip');

    writePluginZip({ root, out, commit: 'abcdef1234567', builtAt: '2026-10-12T00:00:00.000Z' });

    const entries = readZip(readFileSync(out));
    expect(Object.keys(entries).sort()).toEqual([
      'hds-tokens-sync/code.js',
      'hds-tokens-sync/manifest.json',
      'hds-tokens-sync/ui.html',
    ]);
    for (const name of ['code.js', 'manifest.json', 'ui.html']) {
      expect(
        entries[`hds-tokens-sync/${name}`].equals(readFileSync(join(outDir, 'plugin', name))),
      ).toBe(true);
    }
  });

  it('never carries the promote plugin or anything that can prune', () => {
    const root = tempRoot();
    const out = join(root, 'hds-tokens-sync.zip');
    writePluginZip({ root, out, commit: 'abcdef1', builtAt: '2026-10-12T00:00:00.000Z' });
    const names = Object.keys(readZip(readFileSync(out)));
    expect(names.filter((name) => /promote|use-figma/.test(name))).toEqual([]);
  });

  it('writes a json beside the zip naming the build, and its pluginBuild equals the bundle’s', () => {
    const root = tempRoot();
    const outDir = join(root, 'out', 'figma');
    const commit = 'abcdef1234567';

    const { bundle } = writeSyncBundle({ root, out: join(outDir, 'sync-bundle.json'), commit });
    const zip = writePluginZip({
      root,
      out: join(outDir, 'hds-tokens-sync.zip'),
      commit,
      builtAt: '2026-10-12T00:00:00.000Z',
    });

    const meta = JSON.parse(readFileSync(join(outDir, 'hds-tokens-sync.json'), 'utf8'));
    expect(meta).toEqual({
      pluginBuild: bundle.pluginBuild,
      commit,
      builtAt: '2026-10-12T00:00:00.000Z',
      files: [
        'hds-tokens-sync/code.js',
        'hds-tokens-sync/manifest.json',
        'hds-tokens-sync/ui.html',
      ],
    });
    expect(zip.pluginBuild).toBe(bundle.pluginBuild);
    // code.js bakes its own build id in, so the zip's code.js names the bundle's build.
    const entries = readZip(readFileSync(join(outDir, 'hds-tokens-sync.zip')));
    expect(entries['hds-tokens-sync/code.js'].toString('utf8')).toContain(bundle.pluginBuild);
  });

  it('is reproducible: the same inputs give the same zip bytes', () => {
    const root = tempRoot();
    const build = (name) => {
      const out = join(root, name);
      writePluginZip({ root, out, commit: 'abcdef1', builtAt: '2026-10-12T00:00:00.000Z' });
      return readFileSync(out);
    };
    expect(build('a.zip').equals(build('b.zip'))).toBe(true);
  });
});
