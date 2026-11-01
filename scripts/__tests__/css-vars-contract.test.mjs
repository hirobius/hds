/**
 * hds-css-vars --contract (hds#459): every HDS-namespace custom property a
 * consumer reads or writes is checked against the target's
 * dist/css-contract.json. An unknown or removed name fails --check and is a
 * Do by hand item in the upgrade command; a read of Tailwind's private
 * `--tw-*` plumbing is a warning only.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { contractFindings, knownVars, runCodemod } from '../../codemods/css-vars.mjs';
import { PKG, REPO, makeProject, npmLock, pkgJson, runCli } from './helpers/upgrade-fixtures.mjs';

const BIN = join(REPO, 'codemods/css-vars.mjs');

// A target contract: what the target's stylesheets declare, per context.
const CONTRACT = {
  format: 1,
  bundles: {
    './styles.css': {
      classes: ['hds-card'],
      fontFaces: [],
      layers: [],
      variables: {
        '--semantic-color-content-primary': { ':root': '#000', '[data-theme=dark]': '#fff' },
        '--semantic-color-content-secondary': { ':root': '#555' },
        '--semantic-color-surface-page': { ':root': '#fff' },
        '--semantic-color-surface-raised': { ':root': '#fafafa' },
        '--primitive-space-4': { ':root': '16px' },
        '--tw-shadow': { '@layer properties :root': '0 0 #0000' },
      },
    },
  },
  publicClasses: [],
};

const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'hds-css-contract-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
};

// folio app/folio-overlay.css: writes four HDS variables in light and dark.
const FOLIO_OVERLAY = [
  ':root {',
  '  --semantic-color-content-primary: #111;',
  '  --semantic-color-content-secondary: #444;',
  '  --semantic-color-surface-page: #fdfdfd;',
  '  --semantic-color-surface-raised: #f4f4f4;',
  '}',
  '[data-theme="dark"] {',
  '  --semantic-color-content-primary: #eee;',
  '  --semantic-color-content-secondary: #bbb;',
  '  --semantic-color-surface-page: #0b0b0b;',
  '  --semantic-color-surface-raised: #161616;',
  '}',
  '',
].join('\n');

// ops: reads a variable no HDS release ever shipped.
const OPS_CSS = '.muted { color: var(--semantic-color-content-tertiary); }\n';

describe('knownVars', () => {
  it('is every variable any bundle declares, leaving out --tw-* plumbing', () => {
    const known = knownVars(CONTRACT);
    expect(known.has('--semantic-color-content-primary')).toBe(true);
    expect(known.has('--tw-shadow')).toBe(false);
  });
});

describe('contractFindings', () => {
  const known = knownVars(CONTRACT);

  it('folio write case: writes of shipped variables, light and dark, find nothing', () => {
    expect(contractFindings(FOLIO_OVERLAY, known)).toEqual([]);
  });

  it('flags a write of an unknown HDS variable', () => {
    expect(contractFindings(':root { --semantic-color-content-muted: red; }\n', known)).toEqual([
      { name: '--semantic-color-content-muted', line: 1, kind: 'unknown', write: true },
    ]);
  });

  it('ops case: flags a read of a never-shipped variable', () => {
    expect(contractFindings(OPS_CSS, known)).toEqual([
      { name: '--semantic-color-content-tertiary', line: 1, kind: 'unknown', write: false },
    ]);
  });

  it('warns on a --tw-* read as private, and ignores names outside the HDS namespace', () => {
    const src =
      '.a { box-shadow: var(--tw-shadow); color: var(--brand-ink); }\n:root{--my-gap:1px}\n';
    expect(contractFindings(src, known)).toEqual([
      { name: '--tw-shadow', line: 1, kind: 'private', write: false },
    ]);
  });

  it('matches whole names and reports each name once per line', () => {
    const src = '.a { margin: var(--primitive-space-4) var(--primitive-space-4); }\n';
    expect(contractFindings(src, known)).toEqual([]);
    expect(contractFindings('.a{gap:var(--primitive-space-4x)}', known)).toHaveLength(1);
  });
});

describe('runCodemod with a contract', () => {
  it('lists unknown names as manual, private reads as warnings', () => {
    const dir = project({
      'app/folio-overlay.css': FOLIO_OVERLAY,
      'src/ops.css': OPS_CSS,
      'src/shadow.tsx': "export const s = 'var(--tw-shadow)';\n",
    });
    const res = runCodemod({ root: dir, steps: [], contract: CONTRACT });
    expect(res.manual).toEqual([
      {
        file: 'src/ops.css',
        unknown: '--semantic-color-content-tertiary',
        stmt: 'line 1 reads --semantic-color-content-tertiary, which the target release does not ship; replace it by hand',
      },
    ]);
    expect(res.warnings).toEqual([
      {
        file: 'src/shadow.tsx',
        stmt: 'line 1 reads --tw-shadow, a private Tailwind variable that can change in any release',
      },
    ]);
  });

  it('--check --contract exits 1 on the ops fixture and 0 on the folio one', () => {
    const dir = project({ 'src/ops.css': OPS_CSS });
    const contract = join(dir, 'contract.json');
    writeFileSync(contract, JSON.stringify(CONTRACT));
    const empty = join(dir, 'ledger.json');
    writeFileSync(empty, JSON.stringify({ version: '0.40.0', steps: [] }));
    const run = (root) =>
      spawnSync(
        process.execPath,
        [BIN, '--root', root, '--ledger', empty, '--contract', contract, '--check'],
        { encoding: 'utf8' },
      );
    const ops = run(join(dir, 'src'));
    expect(ops.status).toBe(1);
    expect(ops.stderr).toContain('--semantic-color-content-tertiary');
    const folio = project({ 'app/folio-overlay.css': FOLIO_OVERLAY });
    expect(run(folio).status).toBe(0);
  });
});

const posix = process.platform === 'win32' ? it.skip : it;
const built = existsSync(join(REPO, 'dist/css-contract.json'));

describe('upgrade command', () => {
  (built ? posix : it.skip)(
    'lists a never-shipped HDS variable under Do by hand (ops-shaped consumer)',
    () => {
      const root = makeProject({
        'package.json': pkgJson('ops', { [PKG]: '^0.16.0' }),
        'package-lock.json': npmLock('0.16.0'),
        'src/index.css': `@import '${PKG}/styles.css';\n.m { color: var(--semantic-color-text-never-shipped); }\n`,
      });
      const res = runCli(['upgrade', '--root', root, '--check', '--json', '--no-typecheck']);
      const report = JSON.parse(res.stdout);
      const item = report.doByHand.find(
        (i) => i.id === 'hds-css-vars/unknown/--semantic-color-text-never-shipped',
      );
      expect(item).toBeDefined();
      expect(item.files).toEqual(['src/index.css']);
      expect(res.code).not.toBe(0);
      expect(readFileSync(join(root, 'src/index.css'), 'utf8')).toContain('never-shipped');
    },
  );
});
