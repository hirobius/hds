/**
 * Unit tests for the pieces of the upgrade command (hds#452): the detectors
 * that read consumer code, the range bump, the list each step lands in, the
 * Coming next set and the codemod registry. The end-to-end fixtures are in
 * upgrade-command.test.mjs.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO, makeProject, PKG } from './helpers/upgrade-fixtures.mjs';
import { collectFiles, matchDetect } from '../../codemods/lib/scan.mjs';
import { bumpRange } from '../../codemods/lib/semver.mjs';
import { comingNextSteps, listOf, loadRecord } from '../../codemods/lib/record.mjs';
import { CODEMODS, runCodemod } from '../../codemods/registry.mjs';
import { listOf as compileListOf } from '../upgrade/compile.mjs';

const files = (tree) => collectFiles(makeProject(tree));

describe('matchDetect', () => {
  it('finds named imports and re-exports from the exact module, with aliases and type modifiers', () => {
    const f = files({
      'a.tsx': `import { Button, type HdsCheckbox as Box } from '${PKG}';\n`,
      'b.ts': `export { MetricTile } from '${PKG}/patterns';\n`,
      'c.ts': `import { Card } from 'other-lib';\n`,
    });
    expect(matchDetect({ imports: [{ from: PKG, names: ['HdsCheckbox'] }] }, f)).toEqual(['a.tsx']);
    expect(matchDetect({ imports: [{ from: PKG, names: ['MetricTile'] }] }, f)).toEqual([]);
    expect(
      matchDetect({ imports: [{ from: `${PKG}/patterns`, names: ['MetricTile'] }] }, f),
    ).toEqual(['b.ts']);
    expect(matchDetect({ imports: [{ from: PKG, names: ['Card'] }] }, f)).toEqual([]);
  });

  it('reads JSX tags only for names bound to an HDS import, through a local alias', () => {
    const f = files({
      'a.tsx': `import { Card as Panel } from '${PKG}';\nexport const x = <Panel.Header />;\n`,
      'b.tsx': `import { Card } from './local';\nexport const y = <Card />;\n`,
      'c.tsx': `import { Surface } from '${PKG}';\nexport const z = <Surface>hi</Surface>;\n`,
    });
    expect(matchDetect({ jsx: ['Card.Header'] }, f)).toEqual(['a.tsx']);
    expect(matchDetect({ jsx: ['Card'] }, f)).toEqual([]);
    expect(matchDetect({ jsx: ['Surface'] }, f)).toEqual(['c.tsx']);
  });

  it('reads CSS variables, variable writes, classes and bare imports in the files they live in', () => {
    const f = files({
      'styles.css': `.hero { padding: var(--semantic-space-layout-normal); }\n.hds-card:hover { --hds-x: 1px; }\n`,
      'index.html': '<div class="hds-focus wide">x</div>\n',
      'app.tsx': `import ar from '@radix-ui/react-aspect-ratio/dist';\nexport const a = <div className="sm:text-4xl" />;\n`,
      'notes.md': 'var(--semantic-space-layout-normal) is only prose here\n',
    });
    expect(matchDetect({ cssVars: ['--semantic-space-layout-normal'] }, f)).toEqual(['styles.css']);
    expect(matchDetect({ cssVars: ['--semantic-space-layout'] }, f)).toEqual([]);
    expect(matchDetect({ cssVarWrites: ['--hds-x'] }, f)).toEqual(['styles.css']);
    expect(matchDetect({ classes: ['hds-card'] }, f)).toEqual(['styles.css']);
    expect(matchDetect({ classes: ['hds-focus'] }, f)).toEqual(['index.html']);
    expect(matchDetect({ classes: ['sm:text-4xl'] }, f)).toEqual(['app.tsx']);
    expect(matchDetect({ classes: ['wide-x'] }, f)).toEqual([]);
    expect(matchDetect({ bareImports: ['@radix-ui/react-aspect-ratio'] }, f)).toEqual(['app.tsx']);
    expect(matchDetect({ bareImports: ['@radix-ui/react'] }, f)).toEqual([]);
  });

  it('tests regex sources against whole files, and any key matching is a use', () => {
    const f = files({
      'main.ts': `import '${PKG}/tokens.css';\n`,
      'theme.ts': `export const t = { density: 'compact' };\n`,
    });
    expect(
      matchDetect({ regex: ['@hirobius/design-system/(?:tokens|styles)\\.css[\'"]'] }, f),
    ).toEqual(['main.ts']);
    expect(matchDetect({ cssVars: ['--nope'], regex: ['[dD]ensity\\W{0,4}compact'] }, f)).toEqual([
      'theme.ts',
    ]);
  });

  it('skips node_modules, build output and oversized files', () => {
    const big = `import { StatusDot } from '${PKG}';\n${'x'.repeat(2_000_000)}`;
    const f = files({
      'node_modules/x/a.ts': `import { StatusDot } from '${PKG}';\n`,
      'dist/a.js': `import { StatusDot } from '${PKG}';\n`,
      'src/big.ts': big,
      'src/ok.ts': `import { StatusDot } from '${PKG}';\n`,
    });
    expect(matchDetect({ imports: [{ from: PKG, names: ['StatusDot'] }] }, f)).toEqual([
      'src/ok.ts',
    ]);
  });
});

describe('bumpRange', () => {
  it('keeps the operator', () => {
    expect(bumpRange('^0.16.0', '0.21.0')).toBe('^0.21.0');
    expect(bumpRange('~0.16.2', '0.21.0')).toBe('~0.21.0');
    expect(bumpRange('0.16.0', '0.21.0')).toBe('0.21.0');
    expect(bumpRange('>=0.16.0', '0.21.0')).toBe('>=0.21.0');
    expect(bumpRange('^0.16', '0.21.0')).toBe('^0.21.0');
    expect(bumpRange('npm:@hirobius/design-system@^0.16.0', '0.21.0')).toBe(
      'npm:@hirobius/design-system@^0.21.0',
    );
  });

  it('leaves a range it cannot read alone', () => {
    expect(bumpRange('workspace:*', '0.21.0')).toBeNull();
    expect(bumpRange('latest', '0.21.0')).toBeNull();
    expect(bumpRange('>=0.16 <1', '0.21.0')).toBeNull();
    expect(bumpRange('github:hirobius/hds', '0.21.0')).toBeNull();
  });
});

describe('the shipped record', () => {
  const record = loadRecord(REPO);

  it('puts every step in the list compile.mjs puts it in UPGRADING.md', () => {
    for (const ledger of record.ledgers) {
      for (const step of ledger.steps) expect(listOf(step), step.id).toBe(compileListOf(step));
    }
  });

  it('reads one ledger per index version, oldest first', () => {
    expect(record.ledgers.map((l) => l.version)).toEqual(
      record.index.versions.map((v) => v.version),
    );
    expect(readdirSync(join(REPO, 'upgrade/releases')).length).toBe(record.ledgers.length);
  });

  it('Coming next at the latest release is the deprecations index.json lists', () => {
    const steps = comingNextSteps(record.ledgers, record.index.latest).map((s) => s.id);
    const indexed = [...new Set(record.index.deprecated.map((d) => d.step))];
    expect(steps.sort()).toEqual(indexed.sort());
  });

  it('drops a deprecation once the target reaches its removeIn', () => {
    const at = (target) => comingNextSteps(record.ledgers, target).map((s) => s.id);
    expect(at('0.20.0')).toContain('0.20.0/deprecated/StatusDot');
    expect(at('0.21.0')).not.toContain('0.20.0/deprecated/StatusDot');
  });
});

describe('codemod registry', () => {
  const bins = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).bin;

  it('wraps exactly the codemod bins package.json ships, at the same files', () => {
    for (const [name, entry] of Object.entries(CODEMODS)) {
      expect(bins[name], name).toBe(`codemods/${entry.file}`);
    }
    const codemodBins = Object.keys(bins).filter((b) => /^hds-/.test(b));
    expect(Object.keys(CODEMODS).sort()).toEqual(
      codemodBins.filter((b) => !['hds-mcp', 'hds-upgrade'].includes(b)).sort(),
    );
  });

  const tree = () =>
    makeProject({
      'src/a.tsx': `import { HdsCheckbox } from '${PKG}';\nexport const a = <HdsCheckbox />;\n`,
      'apps/b/src/b.tsx': `import { HdsRadio } from '${PKG}';\n`,
    });

  it('runs a codemod in-process, writing only when asked and skipping nested importers', async () => {
    const dir = tree();
    const dry = await runCodemod('hds-prefix', { root: dir, write: false });
    expect(dry.files.sort()).toEqual(['apps/b/src/b.tsx', 'src/a.tsx']);
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('{ HdsCheckbox }');
    const res = await runCodemod('hds-prefix', {
      root: dir,
      write: true,
      skip: [join(dir, 'apps/b')],
    });
    expect(res.files).toEqual(['src/a.tsx']);
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('Checkbox as HdsCheckbox');
    expect(readFileSync(join(dir, 'apps/b/src/b.tsx'), 'utf8')).toContain('{ HdsRadio }');
  });

  it('runs a codemod as a child process with the same answer', async () => {
    const dir = tree();
    const res = await runCodemod('hds-prefix', { root: dir, check: true, child: true });
    expect(res.status).toBe(1);
    expect(res.output).toContain('rewrite needed');
  });

  it('refuses a codemod it does not know', async () => {
    await expect(runCodemod('hds-nope', { root: makeProject({}) })).rejects.toThrow(/hds-nope/);
  });
});
