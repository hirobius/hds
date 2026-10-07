/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-retired-keys.mjs (ADR-026, amended 2026-10-07):
 * a retired Figma file key (figma/links.json `retiredFiles`) anywhere in src,
 * public, docs data or figma data is an ERROR naming the file and line.
 * figma/links.json records the retired keys on purpose, and prose history
 * (ADRs, figma/*.md) may name them, so neither is scanned.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanRetiredKeys } from '../check-figma-retired-keys.mjs';

const LIBRARY = 'LIBRARYKEY000000000000';
const RETIRED = 'RETIREDKEY000000000000';
const url = (key, node) => `https://www.figma.com/design/${key}/HDS?node-id=${node}`;
const LINKS = {
  libraryFileKey: LIBRARY,
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: RETIRED, fileName: 'HDS Tokens & Components (old)' }],
};

const roots = [];
/** A repo root with the four scan roots and `files` ({ relative path: contents }). */
function fixture(files = {}, links = LINKS) {
  const root = mkdtempSync(path.join(tmpdir(), 'retired-keys-'));
  roots.push(root);
  for (const dir of ['figma', 'public', 'docs', 'src/app/components']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  writeFileSync(path.join(root, 'figma/links.json'), JSON.stringify(links));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), body);
  }
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

describe('scanRetiredKeys', () => {
  it('is clean when every link points at the library', () => {
    const root = fixture({
      'src/app/components/badge.tsx': `/** @figma ${url(LIBRARY, '31-15')} */`,
      'public/hds-manifest.json': JSON.stringify({ figmaUrl: url(LIBRARY, '31-15') }),
      'docs/DESIGN_LINKS.md': `| \`Badge\` | [x](${url(LIBRARY, '31-15')}) |\n`,
      'figma/disposition.json': JSON.stringify({ figmaUrl: url(LIBRARY, '31-15') }),
    });
    expect(scanRetiredKeys({ root }).errors).toEqual([]);
  });

  it('errors on a retired key in an @figma tag, naming the file and line', () => {
    const root = fixture({
      'src/app/components/badge.tsx': `export {};\n/** @figma ${url(RETIRED, '31-15')} */\n`,
    });
    expect(scanRetiredKeys({ root }).errors).toEqual([
      { file: 'src/app/components/badge.tsx', line: 2, key: RETIRED },
    ]);
  });

  it('errors on a Code Connect template, the manifest, DESIGN_LINKS.md, docs and figma data', () => {
    const root = fixture({
      'src/app/components/badge.figma.ts': `figma.connect(Badge, '${url(RETIRED, '31-15')}', {})`,
      'public/hds-manifest.json': JSON.stringify({ figmaUrl: url(RETIRED, '31-15') }),
      'docs/DESIGN_LINKS.md': `| \`Badge\` | [x](${url(RETIRED, '31-15')}) |\n`,
      'docs/sync-map.json': JSON.stringify({ figmaUrl: url(RETIRED, '31-15') }),
      'figma/disposition.json': JSON.stringify({ figmaUrl: url(RETIRED, '31-15') }),
      'figma/inventory.json': JSON.stringify({ fileKey: RETIRED }),
      'figma/code-connect-preview.txt': url(RETIRED, '31-15'),
    });
    expect(
      scanRetiredKeys({ root })
        .errors.map((e) => e.file)
        .sort(),
    ).toEqual([
      'docs/DESIGN_LINKS.md',
      'docs/sync-map.json',
      'figma/code-connect-preview.txt',
      'figma/disposition.json',
      'figma/inventory.json',
      'public/hds-manifest.json',
      'src/app/components/badge.figma.ts',
    ]);
  });

  it('a key is a key: a bare retired key with no URL around it is still an error', () => {
    const root = fixture({ 'src/app/data/figma.ts': `export const FILE = '${RETIRED}';\n` });
    expect(scanRetiredKeys({ root }).errors).toHaveLength(1);
  });

  it('does not scan figma/links.json, which records the retired keys, or prose history', () => {
    const root = fixture({
      'docs/adr/026-agent-figma-writes.md': `The old library ${RETIRED} was retired.\n`,
      'docs/pilot.html': `<a href="${url(RETIRED, '1-1')}">pilot</a>`,
      'figma/README.md': `Retired: ${RETIRED}.\n`,
      'figma/MCP-LEDGER.md': `The library ${RETIRED} was not touched.\n`,
    });
    expect(scanRetiredKeys({ root }).errors).toEqual([]);
  });

  it('does not scan generated, gitignored folders under figma/', () => {
    const root = fixture({
      'figma/links/dev-resources.json': JSON.stringify({ file_key: RETIRED }),
      'figma/push/plugin/code.js': `const SYNC = { retired: ['${RETIRED}'] };`,
    });
    expect(scanRetiredKeys({ root }).errors).toEqual([]);
  });

  it('reports the retired keys it scanned for', () => {
    expect(scanRetiredKeys({ root: fixture() }).retiredFileKeys).toEqual([RETIRED]);
  });

  it('is clean, scanning for nothing, when no file is retired', () => {
    const root = fixture({}, { ...LINKS, retiredFiles: [] });
    const r = scanRetiredKeys({ root });
    expect(r.errors).toEqual([]);
    expect(r.retiredFileKeys).toEqual([]);
  });

  it('refuses links.json without a retiredFiles list, so a dropped list cannot pass silently', () => {
    const root = fixture({}, { libraryFileKey: LIBRARY });
    expect(() => scanRetiredKeys({ root })).toThrow(/retiredFiles/);
  });

  it('refuses links.json that lists the library itself as retired', () => {
    const root = fixture(
      {},
      { ...LINKS, retiredFiles: [{ fileKey: LIBRARY, fileName: 'HDS Tokens & Components (old)' }] },
    );
    expect(() => scanRetiredKeys({ root })).toThrow(/libraryFileKey/);
  });

  it('refuses a missing scan root rather than reporting a vacuous pass', () => {
    const root = fixture();
    rmSync(path.join(root, 'docs'), { recursive: true });
    expect(() => scanRetiredKeys({ root })).toThrow(/docs/);
  });
});

describe('the real tree', () => {
  it('links no retired Figma file from src, public, docs data or figma data', () => {
    expect(scanRetiredKeys({}).errors).toEqual([]);
  });
});
