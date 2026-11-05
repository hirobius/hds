/**
 * Tests for codemods/token-keys.mjs (hds#955): rewrites `hds.a.b` token paths
 * from the ledger's steps (`tokens: { 'density.sm': 'semantic.space.scale.xs' }`),
 * the second ledger-driven codemod after hds-prop-map.
 * Seams: `rulesFromSteps`, `transformSource` (pure), `runCodemod` (a tree, and
 * the fixture under the note this package ships) and the CLI.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempTree } from './helpers/codemod-fixture.mjs';
import { CODEMODS, runCodemod as runRegistered } from '../../codemods/registry.mjs';
import { rulesFromSteps, runCodemod, transformSource } from '../../codemods/token-keys.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/token-keys.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__/token-keys');
const NOTE = join(REPO, 'upgrade/sources/0.33.0/notes/token-keys-955.json');
const PKG = '@hirobius/design-system';

const STEPS = [
  {
    id: '9.2.0/renamed/hds.semantic.space.layout',
    kind: 'renamed',
    impact: 'breaking',
    plain: 'semantic.space.layout.tight is scale.sm now.',
    auto: { codemod: 'hds-token-keys', args: [] },
    tokens: { 'semantic.space.layout.tight': 'semantic.space.scale.sm' },
  },
  {
    id: '9.1.0/deprecated/hds.density',
    kind: 'deprecated',
    impact: 'none',
    plain: 'hds.density is deprecated.',
    removeIn: '10.0.0',
    auto: { codemod: 'hds-token-keys', args: [] },
    tokens: { 'density.sm': 'semantic.space.scale.xs', 'density.md': 'semantic.space.scale.sm' },
  },
  // Not this codemod's: another bin, or no tokens.
  {
    id: '9.2.0/prop-renamed/Button.tone',
    kind: 'prop-renamed',
    impact: 'breaking',
    plain: 'Button tone is variant now.',
    auto: { codemod: 'hds-prop-map', args: [] },
    prop: { component: 'Button', name: 'tone', to: 'variant' },
  },
  { id: '9.2.0/removed/Foo', kind: 'removed', impact: 'breaking', plain: 'Foo is gone.' },
];
const RULES = rulesFromSteps(STEPS);

const one = (body, imports = `import { hds } from '${PKG}';`) =>
  transformSource(`${imports}\n${body}\n`, RULES);

const tree = (files) => tempTree('token-keys-', files);

describe('rulesFromSteps', () => {
  it('keeps the token steps in release order, each with its version and map', () => {
    expect(RULES.map((r) => [r.version, Object.keys(r.paths)])).toEqual([
      ['9.1.0', ['density.sm', 'density.md']],
      ['9.2.0', ['semantic.space.layout.tight']],
    ]);
  });

  it('gives a pending step the fallback version', () => {
    const pending = { ...STEPS[1], id: 'deprecated/hds.density' };
    expect(rulesFromSteps([pending], '9.3.0')[0].version).toBe('9.3.0');
  });
});

describe('transformSource', () => {
  it('rewrites hds.density.md to its scale twin', () => {
    const out = one('const a = hds.density.md;');
    expect(out.source).toContain('const a = hds.semantic.space.scale.sm;');
    expect(out.sites).toBe(1);
    expect(out.manual).toEqual([]);
  });

  it('rewrites a deeper path and keeps what follows the key', () => {
    const out = one('const a = hds.semantic.space.layout.tight.length;');
    expect(out.source).toContain('hds.semantic.space.scale.sm.length');
  });

  it('follows an alias and a namespace import', () => {
    expect(one('t.density.sm;', `import { hds as t } from '${PKG}';`).source).toContain(
      't.semantic.space.scale.xs;',
    );
    expect(one('H.hds.density.sm;', `import * as H from '${PKG}';`).source).toContain(
      'H.hds.semantic.space.scale.xs;',
    );
  });

  it('leaves comments, strings, other objects and longer keys alone', () => {
    const body = [
      '// hds.density.md',
      "const s = 'hds.density.md';",
      'const o = other.density.md;',
      'const p = myhds.density.md;',
      'const q = hds.density.mdx;',
    ].join('\n');
    const out = one(body);
    expect(out.changed).toBe(false);
  });

  it('does nothing in a file that does not import hds from the package', () => {
    const out = one('const a = hds.density.md;', "import { hds } from './local';");
    expect(out.changed).toBe(false);
    expect(out.manual).toEqual([]);
  });

  it('lists a computed read of a mapped group, and leaves an unmapped path as written', () => {
    const out = one(
      'const a = hds.density.xs;\nconst b = hds.density[k];\nhds.semantic.space.scale.sm;',
    );
    expect(out.changed).toBe(false);
    expect(out.manual).toHaveLength(1);
    expect(out.manual[0]).toMatch(/hds\.density\[…\] at line 3: 9\.1\.0/);
  });

  it('changes nothing on a second run', () => {
    const first = one('const a = hds.density.md;\nconst b = hds.density.sm;');
    const second = transformSource(first.source, RULES);
    expect(second.changed).toBe(false);
  });

  it('reports each changed line for --dry-run', () => {
    const out = one('const a = hds.density.md;');
    expect(out.edits).toEqual([
      {
        line: 2,
        before: ['const a = hds.density.md;'],
        after: ['const a = hds.semantic.space.scale.sm;'],
      },
    ]);
  });
});

describe('the fixture, with the steps this change ships', () => {
  const steps = JSON.parse(readFileSync(NOTE, 'utf8')).steps;

  it('rewrites hds.density.md and leaves density.xs (no scale twin) for the detect', () => {
    const dir = mkdtempSync(join(tmpdir(), 'token-keys-fx-'));
    cpSync(join(FIXTURES, 'needs-rewrite'), dir, { recursive: true });
    const res = runCodemod({ root: dir, write: true, steps, fallback: '0.33.0' });
    expect(res.files.map((f) => f.file)).toEqual(['src/panel.tsx']);
    expect(res.sites).toBe(2);
    expect(res.manual).toEqual([]);
    const out = readFileSync(join(dir, 'src/panel.tsx'), 'utf8');
    expect(out).toContain('padding: hds.semantic.space.scale.sm,');
    expect(out).toContain('gap: hds.semantic.space.scale.xs,');
    expect(out).toContain('margin: hds.density.xs,');
    expect(out).toContain('// hds.density.md in a comment');
  });

  it('finds nothing in the clean fixture', () => {
    const res = runCodemod({ root: join(FIXTURES, 'clean'), steps });
    expect(res).toEqual({ files: [], sites: 0, manual: [] });
  });
});

describe('registry', () => {
  it('ships hds-token-keys and hands it the steps', async () => {
    expect(CODEMODS['hds-token-keys'].file).toBe('token-keys.mjs');
    const dir = tree({ 'src/a.ts': `import { hds } from '${PKG}';\nhds.density.sm;\n` });
    const res = await runRegistered('hds-token-keys', { root: dir, steps: STEPS });
    expect(res).toEqual({ files: ['src/a.ts'], sites: 1, manual: [] });
  });
});

describe('CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CODEMOD, ...args], { encoding: 'utf8' });
  const ledger = (dir) => {
    const file = join(dir, 'ledger.json');
    writeFileSync(file, JSON.stringify({ version: '9.3.0', steps: STEPS }));
    return file;
  };

  it('--check exits 1 while a rewrite remains, --dry-run prints it and writes nothing', () => {
    const src = `import { hds } from '${PKG}';\nhds.density.md;\n`;
    const dir = tree({ 'src/a.ts': src });
    const check = run(['--root', dir, '--ledger', ledger(dir), '--check']);
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('src/a.ts: 1 site');
    const dry = run(['--root', dir, '--ledger', ledger(dir), '--dry-run']);
    expect(dry.status).toBe(0);
    expect(dry.stdout).toContain('+ hds.semantic.space.scale.sm;');
    expect(readFileSync(join(dir, 'src/a.ts'), 'utf8')).toBe(src);
    expect(run(['--root', dir, '--ledger', ledger(dir)]).status).toBe(0);
    expect(run(['--root', dir, '--ledger', ledger(dir), '--check']).status).toBe(0);
  });

  it('rejects an unknown argument', () => {
    expect(run(['--nope']).status).toBe(2);
  });
});
