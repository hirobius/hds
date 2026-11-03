/**
 * Tests for codemods/prop-map.mjs (hds#460): the first ledger-driven codemod.
 *
 * It takes its rules from the ledger's `prop-renamed` and `prop-value-mapped`
 * steps (`prop: { component, name, to | values }`, hds#461), so a release that
 * renames a prop or maps its values ships a ledger step, not a new bin.
 * Seams: `rulesFromSteps`, `transformSource` (pure), `runCodemod` (a tree) and
 * the CLI (`--root`, `--check`, `--dry-run`, `--ledger`).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expectShipped, tempTree } from './helpers/codemod-fixture.mjs';
import { CODEMODS, runCodemod as runRegistered } from '../../codemods/registry.mjs';
import { rulesFromSteps, runCodemod, transformSource } from '../../codemods/prop-map.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/prop-map.mjs');
const PKG = '@hirobius/design-system';

const STEPS = [
  {
    id: '9.1.0/prop-value-mapped/Stack.direction',
    kind: 'prop-value-mapped',
    impact: 'breaking',
    plain: 'Stack direction "vertical" is "column" now.',
    auto: { codemod: 'hds-prop-map', args: [] },
    prop: {
      component: 'Stack',
      name: 'direction',
      values: { vertical: 'column', horizontal: 'row' },
    },
  },
  {
    id: '9.2.0/prop-renamed/Button.tone',
    kind: 'prop-renamed',
    impact: 'breaking',
    plain: 'Button tone is variant now.',
    auto: { codemod: 'hds-prop-map', args: [] },
    prop: { component: 'Button', name: 'tone', to: 'variant' },
  },
  // Not this codemod's: no auto, or another kind.
  { id: '9.2.0/removed/Foo', kind: 'removed', impact: 'breaking', plain: 'Foo is gone.' },
];
const RULES = rulesFromSteps(STEPS);

const one = (body, imports = `import { Stack, Button } from '${PKG}';`) =>
  transformSource(`${imports}\n${body}\n`, RULES);

const tree = (files) => tempTree('prop-map-', files);

describe('rulesFromSteps', () => {
  it('keeps the prop steps, each with the release its id names', () => {
    expect(RULES).toEqual([
      {
        version: '9.1.0',
        component: 'Stack',
        name: 'direction',
        values: { vertical: 'column', horizontal: 'row' },
      },
      { version: '9.2.0', component: 'Button', name: 'tone', to: 'variant' },
    ]);
  });
});

describe('transformSource', () => {
  it('maps a removed prop literal to the value to pass instead', () => {
    const out = one('<Stack direction="vertical" gap="md"><i /></Stack>;');
    expect(out.changed).toBe(true);
    expect(out.sites).toBe(1);
    expect(out.manual).toEqual([]);
    expect(out.source).toContain('<Stack direction="column" gap="md"><i /></Stack>;');
  });

  it("keeps the literal's quote, and reads a string in braces", () => {
    expect(one("<Stack direction='horizontal' />;").source).toContain("<Stack direction='row' />;");
    expect(one('<Stack direction={"vertical"} />;').source).toContain(
      '<Stack direction={"column"} />;',
    );
    expect(one("<Stack direction={'vertical'} />;").source).toContain(
      "<Stack direction={'column'} />;",
    );
  });

  it('renames a prop and keeps its value', () => {
    expect(one('<Button tone="primary" onClick={go}>Go</Button>;').source).toContain(
      '<Button variant="primary" onClick={go}>Go</Button>;',
    );
    expect(one('<Button\n  tone={t}\n>Go</Button>;').source).toContain(
      '<Button\n  variant={t}\n>Go</Button>;',
    );
  });

  it('follows the name the import binds: an alias, and a namespace import', () => {
    expect(
      one('<Col direction="vertical" />;', `import { Stack as Col } from '${PKG}';`).source,
    ).toContain('<Col direction="column" />;');
    expect(
      one('<H.Stack direction="vertical" />;', `import * as H from '${PKG}';`).source,
    ).toContain('<H.Stack direction="column" />;');
  });

  it('leaves alone a value the step does not map, another component, and a file without the import', () => {
    expect(one('<Stack direction="row" />;').changed).toBe(false);
    expect(one('<Box direction="vertical" />;').changed).toBe(false);
    expect(
      transformSource(`import { Stack } from './local';\n<Stack direction="vertical" />;\n`, RULES)
        .changed,
    ).toBe(false);
  });

  it('reports what it cannot read, naming the release from the step', () => {
    const out = one('<Stack direction={dir} />;');
    expect(out.changed).toBe(false);
    expect(out.manual).toEqual([
      '<Stack direction={dir}> at line 2: 9.1.0 maps direction "vertical" to "column", "horizontal" to "row"; the codemod cannot read the value, so check it by hand',
    ]);
    expect(one('<Button tone="a" variant="b" />;').manual).toEqual([
      '<Button> at line 2 sets both tone and variant (9.2.0 renamed tone to variant); keep one by hand',
    ]);
  });

  it('applies the steps in release order and is idempotent', () => {
    const first = one('<Stack direction="vertical" />;\n<Button tone="x" />;');
    expect(first.sites).toBe(2);
    const second = transformSource(first.source, RULES);
    expect(second.changed).toBe(false);
  });

  it('chains a rename and a later value map on the same prop', () => {
    const rules = [
      { version: '1.0.0', component: 'Stack', name: 'dir', to: 'direction' },
      { version: '1.1.0', component: 'Stack', name: 'direction', values: { vertical: 'column' } },
    ];
    expect(
      transformSource(`import { Stack } from '${PKG}';\n<Stack dir="vertical" />;\n`, rules).source,
    ).toContain('<Stack direction="column" />;');
  });
});

describe('review fixes', () => {
  it('reads a template literal with no ${}', () => {
    expect(one('<Stack direction={`vertical`} />;').source).toContain(
      '<Stack direction={`column`} />;',
    );
  });

  it('puts a pending step (no version) after every released one', () => {
    const pending = { ...STEPS[1], id: 'prop-renamed/Button.tone' };
    expect(rulesFromSteps([pending, STEPS[0]]).map((r) => r.version)).toEqual([
      '9.1.0',
      'the next release',
    ]);
  });

  it('shows a line two steps change as one hunk against the original', () => {
    const rules = [
      { version: '1.0.0', component: 'Stack', name: 'dir', to: 'direction' },
      { version: '1.1.0', component: 'Stack', name: 'direction', values: { vertical: 'column' } },
    ];
    const out = transformSource(
      `import { Stack } from '${PKG}';\n<Stack dir="vertical" />;\n`,
      rules,
    );
    expect(out.edits).toEqual([
      { line: 2, before: ['<Stack dir="vertical" />;'], after: ['<Stack direction="column" />;'] },
    ]);
  });

  it('lists a file it cannot read to its end', () => {
    const out = one('<Stack direction="vertical" />;\nconst t = `open');
    expect(out.manual.some((m) => m.startsWith('unreadable from line'))).toBe(true);
  });
});

describe('runCodemod', () => {
  it('scans .mdx too, writes only when asked, and takes steps from the caller', () => {
    const dir = tree({
      'src/a.tsx': `import { Stack } from '${PKG}';\nexport const a = <Stack direction="vertical" />;\n`,
      'docs/b.mdx': `import { Button } from '${PKG}';\n\n<Button tone="primary">Hi</Button>\n`,
      'src/c.tsx': `export const c = 1;\n`,
    });
    const dry = runCodemod({ root: dir, steps: STEPS });
    expect(dry.files.map((f) => f.file).sort()).toEqual(['docs/b.mdx', 'src/a.tsx']);
    expect(dry.sites).toBe(2);
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('"vertical"');
    runCodemod({ root: dir, steps: STEPS, write: true });
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('direction="column"');
    expect(readFileSync(join(dir, 'docs/b.mdx'), 'utf8')).toContain('<Button variant="primary">');
  });

  it('runs through the registry with the steps the upgrade command hands it', async () => {
    const dir = tree({
      'src/a.tsx': `import { Stack } from '${PKG}';\n<Stack direction="vertical" />;\n`,
    });
    const res = await runRegistered('hds-prop-map', { root: dir, write: true, steps: STEPS });
    expect(res.files).toEqual(['src/a.tsx']);
    expect(res.sites).toBe(1);
  });
});

describe('CLI', () => {
  const run = (dir, ...args) =>
    spawnSync(process.execPath, [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });
  const withLedger = () => {
    const dir = tree({
      'src/a.tsx': `import { Stack } from '${PKG}';\n<Stack direction="vertical" />;\n`,
    });
    const ledger = join(dir, 'ledger.json');
    writeFileSync(ledger, JSON.stringify({ version: '9.1.0', steps: STEPS }));
    return { dir, ledger };
  };

  it('--check exits 1 while a rewrite is needed; --dry-run prints it and writes nothing', () => {
    const { dir, ledger } = withLedger();
    expect(run(dir, '--ledger', ledger, '--check').status).toBe(1);
    const dry = run(dir, '--ledger', ledger, '--dry-run');
    expect(dry.status).toBe(0);
    expect(dry.stdout).toContain('+ <Stack direction="column" />;');
    expect(readFileSync(join(dir, 'src/a.tsx'), 'utf8')).toContain('"vertical"');
  });

  it('a real run rewrites, then --check exits 0', () => {
    const { dir, ledger } = withLedger();
    expect(run(dir, '--ledger', ledger).status).toBe(0);
    expect(run(dir, '--ledger', ledger, '--check').status).toBe(0);
  });

  it('without --ledger reads the steps the package ships, and rejects an unknown argument', () => {
    const dir = tree({ 'src/a.tsx': 'export {};\n' });
    expect(run(dir, '--check').status).toBe(0);
    expect(run(dir, '--nope').status).toBe(2);
  });
});

describe('wiring', () => {
  it('is registered and in package.json#bin and #files', () => {
    expect(CODEMODS['hds-prop-map']).toEqual({ file: 'prop-map.mjs' });
    expectShipped('prop-map');
  });

  it('the upgrade command hands each codemod the steps that name it', () => {
    const source = readFileSync(join(REPO, 'codemods/upgrade.mjs'), 'utf8');
    expect(source).toMatch(/steps:\s*steps\.filter\(\(s\) => s\.auto\?\.codemod === name\)/);
  });
});
