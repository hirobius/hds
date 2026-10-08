/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-retired-keys.mjs (ADR-026, amended 2026-10-07):
 * a link from code to a Figma file that is not the library is an ERROR naming
 * the file and line. Two kinds: a retired file (figma/links.json
 * `retiredFiles`), and HDS Staging (`stagingFileKey`), the draft workbench,
 * since a shipped component links its library node. figma/links.json records
 * the keys on purpose, and prose (ADRs, figma/*.md, where the drawing recipe
 * names the workbench) may name them, so neither is scanned.
 *
 * Seams: scanRetiredKeys({ root }) on a temporary repo root, and the CLI in
 * fixture mode (FIXTURE_DIR) on fixtures/check-figma-retired-keys.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRetiredKeys } from '../check-figma-retired-keys.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIBRARY = 'LIBRARYKEY000000000000';
const RETIRED = 'RETIREDKEY000000000000';
const STAGING = 'STAGINGKEY000000000000';
const url = (key, node) => `https://www.figma.com/design/${key}/HDS?node-id=${node}`;
const LINKS = {
  libraryFileKey: LIBRARY,
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [{ fileKey: RETIRED, fileName: 'HDS Tokens & Components (old)' }],
  stagingFileKey: STAGING,
  stagingFileName: 'HDS Staging',
};

const roots = [];
/** The files the package ships from the repo root (package.json `files`, plus README.md, which npm always packs). */
const ROOT_FILES = ['README.md', 'llms.txt', 'DESIGN.md', 'AGENTS.md', 'CONSUMING.md'];

/** A repo root with the scan roots, the shipped root files and `files` ({ relative path: contents }). */
function fixture(files = {}, links = LINKS) {
  const root = mkdtempSync(path.join(tmpdir(), 'retired-keys-'));
  roots.push(root);
  for (const dir of ['figma', 'public', 'docs', 'src/app/components', 'mcp', 'content/docs']) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const rel of ROOT_FILES) writeFileSync(path.join(root, rel), `# ${rel}\n`);
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
      { file: 'src/app/components/badge.tsx', line: 2, key: RETIRED, kind: 'retired' },
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

  it('errors on the files that ship from the repo root, mcp/, docs/CONSUMING.md and content/docs', () => {
    const root = fixture({
      ...Object.fromEntries(ROOT_FILES.map((rel) => [rel, `See ${url(RETIRED, '31-15')}.\n`])),
      'mcp/catalog.mjs': `export const FIGMA = '${url(RETIRED, '31-15')}';\n`,
      'docs/CONSUMING.md': `Figma: ${url(RETIRED, '31-15')}\n`,
      'content/docs/foundations/color.mdx': `[Figma](${url(RETIRED, '31-15')})\n`,
    });
    expect(
      scanRetiredKeys({ root })
        .errors.map((e) => e.file)
        .sort(),
    ).toEqual(
      [
        ...ROOT_FILES,
        'content/docs/foundations/color.mdx',
        'docs/CONSUMING.md',
        'mcp/catalog.mjs',
      ].sort(),
    );
  });

  it('refuses a missing shipped root file rather than reporting a vacuous pass', () => {
    const root = fixture();
    rmSync(path.join(root, 'llms.txt'));
    expect(() => scanRetiredKeys({ root })).toThrow(/llms\.txt/);
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

  it('errors on an @figma tag, a Code Connect template or a disposition link to HDS Staging: a shipped component links the library', () => {
    const root = fixture({
      'src/app/components/meter.tsx': `export {};\n/** @figma ${url(STAGING, '3-7')} */\n`,
      'src/app/components/meter.figma.ts': `figma.connect(Meter, '${url(STAGING, '3-7')}', {})`,
      'figma/disposition.json': JSON.stringify({ Meter: { figmaUrl: url(STAGING, '3-7') } }),
      'public/hds-manifest.json': JSON.stringify({ figmaUrl: url(STAGING, '3-7') }),
    });
    const { errors, stagingFileKey } = scanRetiredKeys({ root });
    expect(stagingFileKey).toBe(STAGING);
    expect(errors).toContainEqual({
      file: 'src/app/components/meter.tsx',
      line: 2,
      key: STAGING,
      kind: 'staging',
    });
    expect(errors.map((e) => `${e.kind} ${e.file}`).sort()).toEqual([
      'staging figma/disposition.json',
      'staging public/hds-manifest.json',
      'staging src/app/components/meter.figma.ts',
      'staging src/app/components/meter.tsx',
    ]);
  });

  it('lets the drawing recipe, the README and the MCP ledger name HDS Staging: prose is not scanned', () => {
    const root = fixture({
      'figma/COMPONENT-DRAWING-RECIPE.md': `Draft in ${url(STAGING, '0-1')}.\n`,
      'figma/README.md': `HDS Staging: ${STAGING}.\n`,
      'figma/MCP-LEDGER.md': `| 1 | use_figma | write | ${STAGING} 3:7 |\n`,
    });
    expect(scanRetiredKeys({ root }).errors).toEqual([]);
  });

  it('scans for retired keys only when links.json names no staging workbench (it is optional)', () => {
    const { stagingFileKey, stagingFileName, ...withoutStaging } = LINKS;
    expect(stagingFileName).toBe('HDS Staging');
    const root = fixture(
      { 'src/app/data/figma.ts': `export const FILE = '${stagingFileKey}';\n` },
      withoutStaging,
    );
    const r = scanRetiredKeys({ root });
    expect(r.errors).toEqual([]);
    expect(r.stagingFileKey).toBeNull();
  });

  it('refuses links.json whose staging workbench is the library, so a guard cannot reject every library link', () => {
    const root = fixture({}, { ...LINKS, stagingFileKey: LIBRARY });
    expect(() => scanRetiredKeys({ root })).toThrow(/stagingFileKey.*library/);
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

describe('the CLI in fixture mode (fixtures/check-figma-retired-keys)', () => {
  const run = (kind) =>
    spawnSync(process.execPath, ['scripts/check-figma-retired-keys.mjs', '--fixture-mode'], {
      cwd: REPO,
      encoding: 'utf8',
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
        ),
        FIXTURE_DIR: path.join(REPO, 'fixtures', 'check-figma-retired-keys', `${kind}.example.d`),
        HDS_FIXTURE_MODE: '1',
      },
    });

  it('fails on the violating root, naming the staging link and the retired link and the fix for each', () => {
    const r = run('violating');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/src\/app\/components\/meter\.tsx:\d+ links HDS Staging/);
    expect(r.stderr).toMatch(/figma\/disposition\.json:\d+ links HDS Staging/);
    expect(r.stderr).toMatch(/links the retired Figma file/);
    expect(r.stdout).toMatch(/COMPONENT-DRAWING-RECIPE\.md/);
  });

  it('passes on the passing root, where every link is the library', () => {
    const r = run('passing');
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });
});

describe('the real tree', () => {
  it('links no retired Figma file and no HDS Staging draft from src, public, docs data, figma data, mcp, content/docs or the shipped root files', () => {
    const r = scanRetiredKeys({});
    expect(r.stagingFileKey).toBe('C85ZXnwtVc4AteeIOZfXRC');
    expect(r.errors).toEqual([]);
  });
});
