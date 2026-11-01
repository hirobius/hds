/**
 * hds-css-vars (hds#459): the ledger-driven CSS variable codemod. A renamed
 * variable is rewritten in reads and in declarations across stylesheets and
 * code; a removed one is listed by hand; a file that uses neither is a no-op.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rulesFromSteps, runCodemod, transformSource } from '../../codemods/css-vars.mjs';
import { CODEMODS } from '../../codemods/registry.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(REPO, 'codemods/css-vars.mjs');

const STEPS = [
  {
    id: '0.40.0/renamed/--hds-old-gap',
    kind: 'renamed',
    impact: 'breaking',
    plain: 'x',
    auto: { codemod: 'hds-css-vars', args: ['--hds-old-gap', '--hds-new-gap'] },
    detect: { cssVars: ['--hds-old-gap'] },
    source: 'test',
  },
  {
    id: '0.41.0/removed/--hds-accent-bar',
    kind: 'removed',
    impact: 'breaking',
    plain: 'x',
    detect: { cssVars: ['--hds-accent-bar'], cssVarWrites: ['--hds-accent-bar'] },
    source: 'test',
  },
];

const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'hds-css-vars-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
};

describe('rulesFromSteps', () => {
  it('reads renames from auto.args and removals from removed steps', () => {
    const rules = rulesFromSteps(STEPS);
    expect(rules.renames).toEqual([
      { version: '0.40.0', from: '--hds-old-gap', to: '--hds-new-gap' },
    ]);
    expect(rules.removed).toEqual([{ version: '0.41.0', name: '--hds-accent-bar' }]);
  });
});

describe('transformSource', () => {
  const rules = rulesFromSteps(STEPS);

  it('rewrites a renamed variable in a read and in a :root declaration', () => {
    const src = ':root {\n  --hds-old-gap: 4px;\n}\n.a { gap: var(--hds-old-gap); }\n';
    const r = transformSource(src, rules);
    expect(r.source).toBe(':root {\n  --hds-new-gap: 4px;\n}\n.a { gap: var(--hds-new-gap); }\n');
    expect(r.sites).toBe(2);
    expect(r.manual).toEqual([]);
  });

  it('rewrites whole names only', () => {
    const src = '.a { gap: var(--hds-old-gap-x, var(--hds-old-gapped)); }\n';
    expect(transformSource(src, rules).changed).toBe(false);
  });

  it('warns about a removed variable without touching it', () => {
    const src = '.a { color: var(--hds-accent-bar); }\n';
    const r = transformSource(src, rules);
    expect(r.changed).toBe(false);
    expect(r.manual).toEqual([
      'line 1 uses --hds-accent-bar, removed in 0.41.0; replace it by hand',
    ]);
  });

  it('is a no-op on a file that uses neither, and on a second run', () => {
    expect(transformSource('.a { gap: var(--hds-new-gap); }\n', rules).changed).toBe(false);
    const once = transformSource('a { b: var(--hds-old-gap) }', rules).source;
    expect(transformSource(once, rules).changed).toBe(false);
  });
});

describe('runCodemod', () => {
  it('scans css, scss, tsx, html and mdx, writing only when asked', () => {
    const dir = project({
      'src/a.css': '.a { gap: var(--hds-old-gap); }\n',
      'src/b.scss': ':root { --hds-old-gap: 2px; }\n',
      'src/c.tsx': "export const s = { gap: 'var(--hds-old-gap)' };\n",
      'index.html': '<div style="gap: var(--hds-old-gap)"></div>\n',
      'docs/d.mdx': 'Uses `var(--hds-accent-bar)`.\n',
      'src/e.css': '.e { color: red; }\n',
    });
    const dry = runCodemod({ root: dir, steps: STEPS });
    expect(dry.files.map((f) => f.file).sort()).toEqual([
      'index.html',
      'src/a.css',
      'src/b.scss',
      'src/c.tsx',
    ]);
    expect(dry.manual.map((m) => m.file)).toEqual(['docs/d.mdx']);
    expect(readFileSync(join(dir, 'src/a.css'), 'utf8')).toContain('--hds-old-gap');
    runCodemod({ root: dir, steps: STEPS, write: true });
    expect(readFileSync(join(dir, 'src/a.css'), 'utf8')).toContain('var(--hds-new-gap)');
    expect(readFileSync(join(dir, 'src/b.scss'), 'utf8')).toContain('--hds-new-gap: 2px');
  });

  it('--check writes nothing and exits 1 while a rewrite remains', () => {
    const dir = project({ 'src/a.css': '.a { gap: var(--hds-old-gap); }\n' });
    const ledger = join(dir, 'ledger.json');
    writeFileSync(ledger, JSON.stringify({ version: '0.40.0', steps: STEPS }));
    const res = spawnSync(process.execPath, [BIN, '--root', dir, '--ledger', ledger, '--check'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('rewrite needed');
    expect(readFileSync(join(dir, 'src/a.css'), 'utf8')).toContain('--hds-old-gap');
  });

  it('is registered as the hds-css-vars bin', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(CODEMODS['hds-css-vars']).toEqual({ file: 'css-vars.mjs' });
    expect(pkg.bin['hds-css-vars']).toBe('codemods/css-vars.mjs');
  });
});
