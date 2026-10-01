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
  it('imports the bare name under the old local name and changes no other text', () => {
    const src = `import { Button, HdsCheckbox } from '${ROOT}';\nconst x = <HdsCheckbox checked />;\nconst y = <HdsCheckbox></HdsCheckbox>;\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(true);
    expect(out.source).toBe(
      `import { Button, Checkbox as HdsCheckbox } from '${ROOT}';\nconst x = <HdsCheckbox checked />;\nconst y = <HdsCheckbox></HdsCheckbox>;\n`,
    );
    expect(out.renamed).toEqual(['HdsCheckbox']);
    expect(out.sites).toBe(1);
  });

  // hds#389 R1a fix round 2: renaming references broke shapes the codemod could
  // not see (`{...HdsTooltip.defaultProps}` was left pointing at a name that was
  // no longer bound). Only the import specifier changes now, so every reference
  // keeps resolving to the same component, whatever its shape.
  it.each([
    ['a JSX spread of a member', '<HdsTooltip {...HdsTooltip.defaultProps} {...props} />;'],
    ['an array spread', 'const parts = [...HdsTooltip.parts];'],
    ['a string key', "const m = { HdsTooltip: 1 };\nm['HdsTooltip'];"],
    ['typeof and member access', 'type P = typeof HdsTooltip;\nHdsTooltip.displayName;'],
    [
      'a shorthand property and the local export list',
      'const map = { HdsTooltip };\nexport { HdsTooltip, HdsTooltip as Tip };',
    ],
    ['an object or type key', 'type T = { HdsTooltip?: typeof HdsTooltip };'],
    ['a class method after another member', 'class Api {\n  a() {}\n  HdsTooltip() {}\n}'],
    [
      'a TSX generic element and its text',
      '<HdsTooltip<string> label="x">HdsTooltip demo</HdsTooltip>;',
    ],
    [
      'comments, strings and template text',
      "// HdsTooltip row\nconst s = 'HdsTooltip-row';\nconst t = `HdsTooltip ${HdsTooltip.displayName}`;",
    ],
    ['a property of another object', 'cfg.HdsTooltip;'],
    ['a file a tokenizer could not read', "const s = 'unterminated;\n<HdsTooltip />;"],
  ])('leaves %s as written', (_label, body) => {
    const src = `import { HdsTooltip } from '${ROOT}';\n${body}\n`;
    expect(transformSource(src).source).toBe(
      `import { Tooltip as HdsTooltip } from '${ROOT}';\n${body}\n`,
    );
  });

  it('keeps an existing local alias and leaves its uses alone', () => {
    expect(
      transformSource(`import { HdsSelect as Pick } from '${ROOT}';\n<Pick />;\n`).source,
    ).toBe(`import { Select as Pick } from '${ROOT}';\n<Pick />;\n`);
    expect(
      transformSource(`import { HdsCheckbox as Box } from '${ROOT}';\n<Box />;\n`).source,
    ).toBe(`import { Checkbox as Box } from '${ROOT}';\n<Box />;\n`);
  });

  it('keeps the alias when the bare name is already bound in the file', () => {
    const src = `import { Checkbox } from './mine';\nimport { HdsCheckbox } from '${ROOT}';\n<HdsCheckbox /><Checkbox />;\n`;
    expect(transformSource(src).source).toBe(
      `import { Checkbox } from './mine';\nimport { Checkbox as HdsCheckbox } from '${ROOT}';\n<HdsCheckbox /><Checkbox />;\n`,
    );
  });

  it('keeps type modifiers, a default import and multi-line layout', () => {
    const src = `import type { HdsTooltip } from '${ROOT}';\nimport HDS, {\n  type HdsRadio,\n  Stack,\n} from "${ROOT}";\ntype A = typeof HdsTooltip | typeof HdsRadio;\n`;
    expect(transformSource(src).source).toBe(
      `import type { Tooltip as HdsTooltip } from '${ROOT}';\nimport HDS, {\n  type Radio as HdsRadio,\n  Stack,\n} from "${ROOT}";\ntype A = typeof HdsTooltip | typeof HdsRadio;\n`,
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

  // hds#389 R1a fix round 2: the specifier pattern ran over comments in the braces.
  it('keeps comments inside the import braces verbatim', () => {
    const src = [
      'import {',
      '  HdsCheckbox, // HdsToggle later',
      '  /* HdsRadio, */ Button,',
      `} from '${ROOT}';`,
      'export const HdsToggle = 1;',
      '',
    ].join('\n');
    const out = transformSource(src);
    expect(out.source).toBe(src.replace('  HdsCheckbox,', '  Checkbox as HdsCheckbox,'));
    expect(out.renamed).toEqual(['HdsCheckbox']);
  });

  // hds#389 R1a fix round 2: `import { HdsCheckbox as Local } from './local'` was renamed.
  it('touches only imports from the package root: local modules, subpaths and other packages stay', () => {
    const src = [
      "import { HdsCheckbox as Local } from './local';",
      `import { HdsRadio } from '${ROOT}/patterns';`,
      `import { HdsSlider } from '${ROOT}-extra';`,
      `import { HdsCheckbox } from '${ROOT}';`,
      '<Local /><HdsCheckbox /><HdsRadio /><HdsSlider />;',
      '',
    ].join('\n');
    const out = transformSource(src);
    expect(out.source).toBe(
      src.replace(
        `import { HdsCheckbox } from '${ROOT}'`,
        `import { Checkbox as HdsCheckbox } from '${ROOT}'`,
      ),
    );
    expect(transformSource(`import { HdsCheckbox } from './legacy';\n`).changed).toBe(false);
  });

  it('rewrites an import that follows another statement or a comment on its line', () => {
    expect(
      transformSource(`import { A } from 'a'; import { HdsCheckbox } from '${ROOT}';\n`).source,
    ).toBe(`import { A } from 'a'; import { Checkbox as HdsCheckbox } from '${ROOT}';\n`);
    expect(transformSource(`/* ui */ import { HdsRadio } from '${ROOT}';\n`).source).toBe(
      `/* ui */ import { Radio as HdsRadio } from '${ROOT}';\n`,
    );
  });

  it('does not rewrite member access on a namespace import (findUnrewritable lists it)', () => {
    const src = `import * as HDS from '${ROOT}';\n<HDS.HdsSlider />;\n`;
    expect(transformSource(src).changed).toBe(false);
    expect(findUnrewritable(src)).toEqual([`import * as HDS from '${ROOT}' (uses HdsSlider)`]);
  });

  it('treats an import statement inside a template string or a block comment as text', () => {
    expect(
      transformSource(`const doc = \`\nimport { HdsToggle } from '${ROOT}';\n\`;\n`).changed,
    ).toBe(false);
    expect(transformSource(`/*\nimport { HdsToggle } from '${ROOT}';\n*/\n`).changed).toBe(false);
  });

  it('reports each changed line before and after for --dry-run', () => {
    const out = transformSource(`import { HdsCheckbox } from '${ROOT}';\n\n<HdsCheckbox />;\n`);
    expect(out.edits).toEqual([
      {
        line: 1,
        before: `import { HdsCheckbox } from '${ROOT}';`,
        after: `import { Checkbox as HdsCheckbox } from '${ROOT}';`,
      },
    ]);
  });

  it('is idempotent: a second run changes nothing', () => {
    for (const src of [
      `import { HdsCheckbox, HdsSelect as Pick, type HdsTooltip } from '${ROOT}';\n<HdsCheckbox />;\n`,
      `export { HdsToggle } from '${ROOT}';\n`,
      `import {\n  HdsRadio, // HdsRadio\n} from '${ROOT}';\n`,
    ]) {
      const once = transformSource(src);
      expect(once.changed).toBe(true);
      const twice = transformSource(once.source);
      expect(twice.changed).toBe(false);
      expect(twice.source).toBe(once.source);
      expect(findUnrewritable(once.source)).toEqual([]);
    }
  });

  // hds#389 R1a fix round 2: the old scanner tried each `<T>` as JSX first and
  // recursed, so 6,000 casts overflowed the stack.
  it('reads a 10,000-line file with 6,000 `<any>` casts in under a second', () => {
    const lines = [
      `import { HdsCheckbox } from '${ROOT}';`,
      `const lazy = import('${ROOT}').then((m) => m.Button);`,
    ];
    for (let i = 0; i < 6000; i++) lines.push(`const w${i} = (<any>window).x${i};`);
    for (let i = 0; i < 2000; i++) lines.push(`const f${i} = <T>(x: T): T => x;`);
    while (lines.length < 10000) lines.push(`export const n${lines.length} = ${lines.length};`);
    const src = `${lines.join('\n')}\n`;
    const t0 = performance.now();
    const out = transformSource(src);
    const manual = findUnrewritable(out.source);
    const ms = performance.now() - t0;
    expect(out.source.split('\n')[0]).toBe(`import { Checkbox as HdsCheckbox } from '${ROOT}';`);
    expect(manual).toEqual([]);
    expect(ms).toBeLessThan(1000);
  });
});

describe('findUnrewritable', () => {
  it('flags star re-exports of the root, whose importers it cannot see', () => {
    expect(findUnrewritable(`export * from '${ROOT}';\n`)).toHaveLength(1);
    expect(findUnrewritable(`export * as HDS from '${ROOT}';\n`)).toHaveLength(1);
  });

  it('flags a namespace import that reads an Hds* name off something', () => {
    const ns = `import * as HDS from '${ROOT}'`;
    expect(findUnrewritable(`${ns};\nconst { HdsCheckbox } = HDS;\n`)).toEqual([
      `${ns} (uses HdsCheckbox)`,
    ]);
    expect(findUnrewritable(`${ns};\nconst { HdsCheckbox: Box } = HDS;\n`)).toEqual([
      `${ns} (uses HdsCheckbox)`,
    ]);
    expect(findUnrewritable(`${ns};\n<HDS.HdsSlider />;\n`)).toEqual([`${ns} (uses HdsSlider)`]);
    expect(findUnrewritable(`${ns};\nconst C = HDS?.HdsSlider;\n`)).toEqual([
      `${ns} (uses HdsSlider)`,
    ]);
  });

  // hds#389 R1a fix round 2 (regression in round 1): a string-key read was missed.
  it("flags a namespace member read through a string key (HDS['HdsSlider'])", () => {
    expect(
      findUnrewritable(`import * as HDS from '${ROOT}';\nconst C = HDS['HdsSlider'];\n`),
    ).toEqual([`import * as HDS from '${ROOT}' (uses HdsSlider)`]);
    expect(
      findUnrewritable(`import * as HDS from '${ROOT}';\nconst C = HDS["HdsSlider"];\n`),
    ).toEqual([`import * as HDS from '${ROOT}' (uses HdsSlider)`]);
  });

  it('accepts a namespace import whose Hds* name is left only in text or as a bare identifier', () => {
    const src = [
      `import * as HDS from '${ROOT}';`,
      `import { Checkbox as HdsCheckbox } from '${ROOT}';`,
      '// was HDS.HdsSlider',
      `const s = "HDS['HdsSlider']";`,
      '<HDS.Slider data-x="HdsSlider" />;',
      '<HdsCheckbox />;',
      '',
    ].join('\n');
    expect(findUnrewritable(src)).toEqual([]);
  });

  // hds#389 R1a review: a dynamic import or require of the root hides which
  // names it uses, so the codemod lists it for a manual edit.
  it('flags a dynamic import() or require() of the root that reads an Hds* name', () => {
    expect(
      findUnrewritable(`const T = await import('${ROOT}').then((m) => m.HdsToggle);\n`),
    ).toEqual([`import('${ROOT}') (uses HdsToggle)`]);
    expect(findUnrewritable(`const { HdsRadio } = require("${ROOT}");\n`)).toEqual([
      `require('${ROOT}') (uses HdsRadio)`,
    ]);
  });

  // hds#389 R1a fix round 2: forms the round-1 detector missed.
  it.each([
    [
      'a comment before the specifier',
      `import(/* webpackChunkName: "hds" */ '${ROOT}').then((m) => m.HdsToggle);`,
      'import',
    ],
    ['a string-key read', `import('${ROOT}').then((m) => m['HdsToggle']);`, 'import'],
    ['jest.requireMock', `const T = jest.requireMock('${ROOT}').HdsToggle;`, 'requireMock'],
    [
      'jest.unstable_mockModule',
      `jest.unstable_mockModule('${ROOT}', () => ({}));\nconst { HdsToggle } = await import('./x');`,
      'unstable_mockModule',
    ],
    [
      'vi.mock with a renamed destructure',
      `vi.mock('${ROOT}');\nconst { HdsToggle: T } = mod;`,
      'mock',
    ],
    [
      'jest.requireActual',
      `const a = jest.requireActual('${ROOT}');\na.HdsToggle;`,
      'requireActual',
    ],
  ])('flags %s', (_label, body, kind) => {
    expect(findUnrewritable(`${body}\n`)).toContain(`${kind}('${ROOT}') (uses HdsToggle)`);
  });

  // hds#389 R1a fix round 2: any identifier spelled like an alias used to keep
  // --check red forever, including the binding the codemod itself writes.
  it('does not flag a dynamic import when the Hds* name is only a bare identifier', () => {
    const src = [
      "import { Toggle } from './mine';",
      `import { Toggle as HdsToggle } from '${ROOT}';`,
      `const L = lazy(() => import('${ROOT}').then((m) => ({ default: m.Button })));`,
      'const parts = [...HdsToggle.parts];',
      'export const A = () => <HdsToggle {...HdsToggle.defaultProps}><Toggle /></HdsToggle>;',
      '',
    ].join('\n');
    expect(findUnrewritable(src)).toEqual([]);
  });

  it('reads code after a URL in JSX text on the same line', () => {
    const src = `import('${ROOT}');\nconst a = <a>https://example.com</a>; const b = m.HdsToggle;\n`;
    expect(findUnrewritable(src)).toEqual([`import('${ROOT}') (uses HdsToggle)`]);
  });

  it('does not flag a dynamic import that reads no Hds* name, or one only spelled in text', () => {
    expect(findUnrewritable(`const { Button } = await import('${ROOT}');\n`)).toEqual([]);
    expect(
      findUnrewritable(`// require('${ROOT}').HdsRadio\nconst s = "import('${ROOT}') HdsRadio";\n`),
    ).toEqual([]);
    expect(
      findUnrewritable(`const P = import('${ROOT}/patterns').then((m) => m.HdsRadio);\n`),
    ).toEqual([]);
  });
});

describe('package', () => {
  it('ships every codemods/ module a codemod bin imports', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    for (const bin of Object.values(pkg.bin)) {
      const src = readFileSync(join(REPO, bin), 'utf8');
      for (const [, rel] of src.matchAll(/^import .* from '\.\/([^']+)';$/gm))
        expect(pkg.files, `${bin} imports ./${rel}`).toContain(`codemods/${rel}`);
    }
  });

  it('ships no codemods/ module that nothing imports', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    const imported = new Set(Object.values(pkg.bin));
    for (const bin of Object.values(pkg.bin))
      for (const [, rel] of readFileSync(join(REPO, bin), 'utf8').matchAll(
        /^import .* from '\.\/([^']+)';$/gm,
      ))
        imported.add(`codemods/${rel}`);
    const shipped = pkg.files.filter((f) => /^codemods\/.*\.mjs$/.test(f));
    expect(shipped.filter((f) => !imported.has(f))).toEqual([]);
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
  const runIn = (root, ...args) =>
    spawnSync('node', [CODEMOD, '--root', root, ...args], { encoding: 'utf8' });

  it('--check exits 1 before a rewrite and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8');
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/panel\.tsx/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toBe(before);
  });

  it('--dry-run reports counts and the changed import lines only, exits 0 and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8');
    const r = run('--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/3 files/);
    expect(r.stdout).toMatch(/3 import sites/);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-   HdsCheckbox,');
    expect(lines).toContain('+   Checkbox as HdsCheckbox,');
    expect(r.stdout).not.toMatch(/<HdsCheckbox checked/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0 and a second run is a no-op; clean files and node_modules are untouched', () => {
    const clean = readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8');
    expect(run().status).toBe(0);
    const panel = readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8');
    expect(panel).toContain('  Checkbox as HdsCheckbox,\n');
    expect(panel).toContain('<HdsCheckbox checked={on} />');
    expect(readFileSync(join(dir, 'needs-rewrite/src/bound.tsx'), 'utf8')).toContain(
      `import { Checkbox as HdsCheckbox, Select as Pick, type Tooltip as HdsTooltip } from '${ROOT}';`,
    );
    expect(run('--check').status).toBe(0);
    const again = run();
    expect(again.status).toBe(0);
    expect(again.stdout).toMatch(/rewrote 0 files/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toBe(panel);
    expect(readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8')).toBe(clean);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      'HdsCheckbox',
    );
  });

  // Every probe the hds#389 R1a round-2 verifier wrote: after one real run,
  // --check is green and the rewritten files keep every reference bound.
  it('rewrites the verifier probes so that --check exits 0 afterwards', () => {
    const probes = join(dir, 'probes');
    mkdirSync(probes);
    const files = {
      'Tip.tsx': `import { HdsTooltip } from '${ROOT}';\nexport const Tip = (props: object) => <HdsTooltip {...HdsTooltip.defaultProps} {...props} />;\nexport const parts = [...HdsTooltip.parts];\n`,
      'a.tsx': `import { Toggle } from './toggle';\nimport { HdsToggle } from '${ROOT}';\nexport const L = lazy(() => import('${ROOT}').then((m) => ({ default: m.Button })));\nexport const A = () => <HdsToggle><Toggle /></HdsToggle>;\n`,
      'braces.tsx': `import {\n  HdsCheckbox, // HdsToggle later\n  Button,\n} from '${ROOT}';\nexport const HdsToggle = 1;\nexport const B = () => <HdsCheckbox />;\n`,
      'local.tsx': `import { HdsCheckbox as Local } from './local';\nimport { HdsCheckbox } from '${ROOT}';\nexport const C = () => <><Local /><HdsCheckbox /></>;\n`,
    };
    for (const [name, body] of Object.entries(files)) writeFileSync(join(probes, name), body);
    expect(runIn(probes, '--check').status).toBe(1);
    expect(runIn(probes).status).toBe(0);
    const out = (name) => readFileSync(join(probes, name), 'utf8');
    expect(out('Tip.tsx')).toBe(
      files['Tip.tsx'].replace('{ HdsTooltip }', '{ Tooltip as HdsTooltip }'),
    );
    expect(out('a.tsx')).toBe(files['a.tsx'].replace('{ HdsToggle }', '{ Toggle as HdsToggle }'));
    expect(out('braces.tsx')).toBe(
      files['braces.tsx'].replace('  HdsCheckbox,', '  Checkbox as HdsCheckbox,'),
    );
    expect(out('local.tsx')).toBe(
      files['local.tsx'].replace(
        `{ HdsCheckbox } from '${ROOT}'`,
        `{ Checkbox as HdsCheckbox } from '${ROOT}'`,
      ),
    );
    const check = runIn(probes, '--check');
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
  });

  it('--check exits 1 and names a dynamic import of the root that reads an Hds* name', () => {
    writeFileSync(
      join(dir, 'clean/lazy.tsx'),
      `export const Lazy = () => import('${ROOT}').then((m) => m.HdsToggle);\n`,
    );
    const r = runIn(join(dir, 'clean'), '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/lazy\.tsx: import\('@hirobius\/design-system'\) \(uses HdsToggle\)/);
  });

  it('--check exits 1 for a star re-export of the root it cannot follow', () => {
    writeFileSync(join(dir, 'clean/barrel.ts'), `export * from '${ROOT}';\n`);
    const r = runIn(join(dir, 'clean'), '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/barrel\.ts/);
  });
});
