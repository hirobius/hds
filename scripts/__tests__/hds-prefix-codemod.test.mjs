/**
 * Tests for codemods/hds-prefix.mjs (hds#389 R1, follows hds#315).
 * Seams: `transformSource` (pure), `findUnrewritable` (pure) and the CLI
 * (`--root`, `--check`, `--dry-run`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENAMES, transformSource, findUnrewritable } from '../../codemods/hds-prefix.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/hds-prefix.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__/hds-prefix');
const ROOT = '@hirobius/design-system';

describe('RENAMES', () => {
  it('maps the six Hds* aliases 0.19.1 shipped to their bare names', () => {
    expect(RENAMES).toEqual({
      HdsCheckbox: 'Checkbox',
      HdsRadio: 'Radio',
      HdsSelect: 'Select',
      HdsSlider: 'Slider',
      HdsToggle: 'Toggle',
      HdsTooltip: 'Tooltip',
    });
  });
});

describe('transformSource', () => {
  it('renames the import and every use when the bare name is free', () => {
    const src = `import { Button, HdsCheckbox } from '${ROOT}';\nconst x = <HdsCheckbox checked />;\nconst y = <HdsCheckbox></HdsCheckbox>;\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(true);
    expect(out.source).toBe(
      `import { Button, Checkbox } from '${ROOT}';\nconst x = <Checkbox checked />;\nconst y = <Checkbox></Checkbox>;\n`,
    );
    expect(out.renamed).toEqual(['HdsCheckbox']);
  });

  it('keeps the local name as an alias when the bare name is already bound in the file', () => {
    const src = `import { Checkbox } from './mine';\nimport { HdsCheckbox } from '${ROOT}';\n<HdsCheckbox />;\n`;
    const out = transformSource(src);
    expect(out.source).toBe(
      `import { Checkbox } from './mine';\nimport { Checkbox as HdsCheckbox } from '${ROOT}';\n<HdsCheckbox />;\n`,
    );
  });

  it('rewrites an aliased import to the bare name and leaves its uses alone', () => {
    const out = transformSource(`import { HdsSelect as Pick } from '${ROOT}';\n<Pick />;\n`);
    expect(out.source).toBe(`import { Select as Pick } from '${ROOT}';\n<Pick />;\n`);
  });

  it('keeps type modifiers and multi-line layout', () => {
    const src = `import type { HdsTooltip } from '${ROOT}';\nimport {\n  type HdsRadio,\n  Stack,\n} from '${ROOT}';\ntype A = typeof HdsTooltip | typeof HdsRadio;\n`;
    expect(transformSource(src).source).toBe(
      `import type { Tooltip } from '${ROOT}';\nimport {\n  type Radio,\n  Stack,\n} from '${ROOT}';\ntype A = typeof Tooltip | typeof Radio;\n`,
    );
  });

  it('rewrites re-exports without changing the name the file exports', () => {
    expect(transformSource(`export { HdsToggle, Badge } from '${ROOT}';\n`).source).toBe(
      `export { Toggle as HdsToggle, Badge } from '${ROOT}';\n`,
    );
    expect(transformSource(`export { HdsToggle as Switch } from '${ROOT}';\n`).source).toBe(
      `export { Toggle as Switch } from '${ROOT}';\n`,
    );
  });

  it('rewrites member access on a namespace import of the root', () => {
    const src = `import * as HDS from '${ROOT}';\n<HDS.HdsSlider />;\n`;
    expect(transformSource(src).source).toBe(`import * as HDS from '${ROOT}';\n<HDS.Slider />;\n`);
  });

  it('touches only the root package: subpaths, local modules and other objects stay', () => {
    const src = `import { HdsCheckbox } from './legacy';\nimport { Page } from '${ROOT}/patterns';\nconst a = cfg.HdsCheckbox;\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(false);
    expect(out.source).toBe(src);
  });

  it('does not rename a property of another object while renaming the binding', () => {
    const src = `import { HdsToggle } from '${ROOT}';\nconst t = [HdsToggle, cfg.HdsToggle];\n`;
    expect(transformSource(src).source).toBe(
      `import { Toggle } from '${ROOT}';\nconst t = [Toggle, cfg.HdsToggle];\n`,
    );
  });

  it('reports each changed line before and after for --dry-run', () => {
    const out = transformSource(`import { HdsCheckbox } from '${ROOT}';\n\n<HdsCheckbox />;\n`);
    expect(out.edits).toEqual([
      {
        line: 1,
        before: `import { HdsCheckbox } from '${ROOT}';`,
        after: `import { Checkbox } from '${ROOT}';`,
      },
      { line: 3, before: '<HdsCheckbox />;', after: '<Checkbox />;' },
    ]);
  });
});

describe('findUnrewritable', () => {
  it('flags star re-exports of the root, whose importers it cannot see', () => {
    expect(findUnrewritable(`export * from '${ROOT}';\n`)).toHaveLength(1);
    expect(findUnrewritable(`export * as HDS from '${ROOT}';\n`)).toHaveLength(1);
  });

  it('flags a namespace import whose Hds* use is not a plain member access', () => {
    const src = `import * as HDS from '${ROOT}';\nconst { HdsCheckbox } = HDS;\n`;
    expect(findUnrewritable(transformSource(src).source)).toHaveLength(1);
  });

  it('accepts a namespace import once its member accesses are rewritten', () => {
    const src = transformSource(`import * as HDS from '${ROOT}';\n<HDS.HdsSlider />;\n`).source;
    expect(findUnrewritable(src)).toEqual([]);
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-prefix-'));
    cpSync(FIXTURES, dir, { recursive: true });
    // node_modules is gitignored, so the fixture is built here rather than committed.
    mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
    writeFileSync(
      join(dir, 'clean/node_modules/x/index.js'),
      `import { HdsCheckbox } from '${ROOT}';\n`,
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) =>
    spawnSync('node', [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });

  it('--check exits 1 before a rewrite and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8');
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/panel\.tsx/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toBe(before);
  });

  it('--dry-run reports counts and the changed lines, exits 0 and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8');
    const r = run('--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/3 files/);
    expect(r.stdout).toMatch(/3 import sites/);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-     <HdsCheckbox checked={on} />');
    expect(lines).toContain('+     <Checkbox checked={on} />');
    expect(readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0; clean files and node_modules are untouched', () => {
    const clean = readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8');
    expect(run().status).toBe(0);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toContain(
      '<Checkbox checked={on} />',
    );
    expect(readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8')).toContain(
      `import { Checkbox as HdsCheckbox, Select as Pick, type Tooltip } from '${ROOT}';`,
    );
    expect(run('--check').status).toBe(0);
    expect(readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8')).toBe(clean);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      'HdsCheckbox',
    );
  });

  it('--check exits 1 for a star re-export of the root it cannot follow', () => {
    writeFileSync(join(dir, 'clean/barrel.ts'), `export * from '${ROOT}';\n`);
    const r = spawnSync('node', [CODEMOD, '--root', join(dir, 'clean'), '--check'], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/barrel\.ts/);
  });
});
