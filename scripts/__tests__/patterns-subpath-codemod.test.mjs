/**
 * Tests for codemods/patterns-subpath.mjs (hds#316).
 * Seams: `transformSource` (pure) and the CLI (`--root`, `--check`, `--dry-run`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  transformSource,
  findUnrewritable,
  loadPatternNames,
} from '../../codemods/patterns-subpath.mjs';
import { derivePatternNames } from '../build-codemod-pattern-names.mjs';
import { collectModuleSymbols, collectPublicApi } from '../lib/check-public-api.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/patterns-subpath.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__');
const NAMES = new Set(['Page', 'TopNav', 'AppShell', 'SideNav', 'Toolbar', 'Reveal']);
const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';

/**
 * The 21 pattern modules the package root re-exported until 0.20.0 (hds#254,
 * hds#389 R1). Pinned here because src/index.ts no longer names them.
 */
const ROOT_REMOVED_MODULES = [
  'activity-feed',
  'app-shell',
  'asset-img',
  'calendar',
  'carousel',
  'code-block',
  'command-palette',
  'doc-link-card',
  'error-pattern',
  'file-input',
  'form',
  'image-lightbox',
  'nav-item',
  'overflow-list',
  'page',
  'reveal',
  'side-nav',
  'stepper',
  'toolbar',
  'top-nav',
  'tree-list',
];

describe('pattern name list', () => {
  const surface = collectPublicApi(REPO);
  const rootNames = new Set(
    Object.entries(surface.modules)
      .filter(([key]) => !key.startsWith('@subpath/'))
      .flatMap(([, names]) => names),
  );
  const listed = loadPatternNames();

  it('is derived from /patterns minus the root (pnpm codemod:names), not hand-kept', () => {
    expect([...listed].sort()).toEqual(derivePatternNames(surface));
    expect(listed.has('Page')).toBe(true);
    expect(listed.has('Button')).toBe(false);
  });

  it('holds every name the root exported from the 21 removed modules, types and parts included', () => {
    // 15 of the 21 modules were then deleted in 0.20.0 (hds#394 wave 4a): their
    // names are in codemods/removed-0.20.json, which the codemod reports instead.
    const { modules: removedModules } = JSON.parse(
      readFileSync(join(REPO, 'codemods/removed-0.20.json'), 'utf8'),
    );
    const exported = ROOT_REMOVED_MODULES.flatMap((m) => {
      const file = `src/app/components/${m}.tsx`;
      if (existsSync(join(REPO, file))) return collectModuleSymbols(join(REPO, file));
      expect(removedModules[file], `${file} is gone but not in removed-0.20.json`).toBeDefined();
      return [];
    });
    const removed = ROOT_REMOVED_MODULES.flatMap(
      (m) => removedModules[`src/app/components/${m}.tsx`] ?? [],
    );
    expect(exported.length + removed.length).toBeGreaterThanOrEqual(79);
    for (const name of exported) {
      expect(listed.has(name), `${name} is missing from the codemod list`).toBe(true);
    }
  });

  it('is a pure path change: /patterns exports every listed name and the root none of them', () => {
    const patterns = new Set(surface.modules['@subpath/patterns']);
    for (const name of listed) {
      expect(patterns.has(name), `${name} is not exported from /patterns`).toBe(true);
      expect(rootNames.has(name), `${name} is still exported from the root`).toBe(false);
    }
  });
});

describe('transformSource', () => {
  it('moves pattern names to the subpath and keeps other named imports', () => {
    const src = `import { Button, Page, TopNav, Badge } from '${ROOT}';\n`;
    const out = transformSource(src, NAMES);
    expect(out.changed).toBe(true);
    expect(out.source).toBe(
      `import { Button, Badge } from '${ROOT}';\nimport { Page, TopNav } from '${SUB}';\n`,
    );
    expect(out.moved).toEqual(['Page', 'TopNav']);
  });

  it('drops the root import when nothing else is left, preserving aliases and multi-line layout', () => {
    const src = `import {\n  AppShell,\n  SideNav as Nav,\n} from '${ROOT}';\n`;
    const out = transformSource(src, NAMES);
    expect(out.source).toBe(`import {\n  AppShell,\n  SideNav as Nav,\n} from '${SUB}';\n`);
  });

  it('keeps type-only imports type-only', () => {
    const out = transformSource(`import type { Button, Toolbar } from '${ROOT}';\n`, NAMES);
    expect(out.source).toBe(
      `import type { Button } from '${ROOT}';\nimport type { Toolbar } from '${SUB}';\n`,
    );
  });

  it('merges into an existing subpath import of the same kind', () => {
    const src = `import { Button, Page } from '${ROOT}';\nimport { Reveal } from '${SUB}';\n`;
    const out = transformSource(src, NAMES);
    expect(out.source).toBe(
      `import { Button } from '${ROOT}';\nimport { Reveal, Page } from '${SUB}';\n`,
    );
  });

  it('leaves clean files, comments and strings alone', () => {
    const src = `// import { Page } from '${ROOT}'\nconst s = "import { Page } from '${ROOT}'";\nimport { Button } from '${ROOT}';\n`;
    const out = transformSource(src, NAMES);
    expect(out.changed).toBe(false);
    expect(out.source).toBe(src);
  });
});

describe('transformSource: other import forms', () => {
  it('splits a default + named import, keeping the default on the root', () => {
    const out = transformSource(`import HDS, { Button, Page } from '${ROOT}';\n`, NAMES);
    expect(out.source).toBe(
      `import HDS, { Button } from '${ROOT}';\nimport { Page } from '${SUB}';\n`,
    );
  });

  it('keeps only the default on the root when every named import moves', () => {
    const out = transformSource(`import HDS, { Page } from '${ROOT}';\n`, NAMES);
    expect(out.source).toBe(`import HDS from '${ROOT}';\nimport { Page } from '${SUB}';\n`);
  });

  it('rewrites re-exports', () => {
    const out = transformSource(`export { Button, Page } from '${ROOT}';\n`, NAMES);
    expect(out.source).toBe(`export { Button } from '${ROOT}';\nexport { Page } from '${SUB}';\n`);
  });

  it('rewrites indented imports and keeps the indent', () => {
    const out = transformSource(`  import { Page } from '${ROOT}';\n`, NAMES);
    expect(out.source).toBe(`  import { Page } from '${SUB}';\n`);
  });

  it('reports each edit as before/after text for --dry-run', () => {
    const out = transformSource(`import { Button, Page } from '${ROOT}';\n`, NAMES);
    expect(out.edits).toEqual([
      {
        before: `import { Button, Page } from '${ROOT}';`,
        after: `import { Button } from '${ROOT}';\nimport { Page } from '${SUB}';`,
      },
    ]);
  });
});

describe('findUnrewritable', () => {
  it('flags star re-exports of the root, whose importers it cannot see', () => {
    expect(findUnrewritable(`export * from '${ROOT}';\n`, NAMES)).toHaveLength(1);
    expect(findUnrewritable(`export * as HDS from '${ROOT}';\n`, NAMES)).toHaveLength(1);
  });

  // hds#389 R1a fix round 2: a namespace import is listed only when the file
  // reads a pattern name off something, so a migrated file can reach exit 0.
  it('flags a namespace import of the root only when the file reads a pattern name off it', () => {
    expect(findUnrewritable(`import * as HDS from '${ROOT}';\n<HDS.Page />;\n`, NAMES)).toEqual([
      `import * as HDS from '${ROOT}' (uses Page)`,
    ]);
    expect(
      findUnrewritable(`import HDS, * as All from '${ROOT}';\nconst P = All['TopNav'];\n`, NAMES),
    ).toEqual([`import HDS, * as All from '${ROOT}' (uses TopNav)`]);
    expect(findUnrewritable(`import * as HDS from '${ROOT}';\n<HDS.Button />;\n`, NAMES)).toEqual(
      [],
    );
  });

  // hds#389 R1a review: a dynamic import or require of the root hides which
  // names it uses, so the codemod lists it for a manual edit.
  it('flags a dynamic import() or require() of the root that reads a pattern name', () => {
    expect(
      findUnrewritable(`const P = await import('${ROOT}').then((m) => m.Page);\n`, NAMES),
    ).toEqual([`import('${ROOT}') (uses Page)`]);
    expect(findUnrewritable(`const { TopNav, Button } = require('${ROOT}');\n`, NAMES)).toEqual([
      `require('${ROOT}') (uses TopNav)`,
    ]);
  });

  // hds#389 R1a fix round 2: forms the round-1 detector missed.
  it.each([
    [
      'a comment before the specifier',
      `import(/* webpackChunkName: "hds" */ '${ROOT}').then((m) => m.Page);`,
      'import',
    ],
    ['a string-key read', `import('${ROOT}').then((m) => m['Page']);`, 'import'],
    ['jest.requireMock', `const { Page } = jest.requireMock('${ROOT}');`, 'requireMock'],
    [
      'jest.unstable_mockModule',
      `jest.unstable_mockModule('${ROOT}', () => ({}));\nconst m = await import('./x');\nm.Page;`,
      'unstable_mockModule',
    ],
    ['vi.importActual', `const a = await vi.importActual('${ROOT}');\na.Page;`, 'importActual'],
  ])('flags %s', (_label, body, kind) => {
    expect(findUnrewritable(`${body}\n`, NAMES)).toContain(`${kind}('${ROOT}') (uses Page)`);
  });

  // hds#389 R1a fix round 2: a migrated file that also loads the root for
  // another name stayed at --check exit 1 forever.
  it.each([
    [
      'the /patterns import the codemod wrote',
      `import { Page } from '${SUB}';\nconst L = import('${ROOT}').then((m) => m.Button);\n<Page />;`,
    ],
    ['a local type', `type Page = string;\nconst { Button } = require('${ROOT}');`],
    [
      'a vi.mock of the root',
      `import { Page } from '${SUB}';\nvi.mock('${ROOT}', () => ({ Button: () => null }));\n<Page />;`,
    ],
    [
      'a spread',
      `import { Page } from '${SUB}';\nimport('${ROOT}');\nconst p = { ...Page.defaults };`,
    ],
  ])('does not flag a pattern name that is only %s', (_label, body) => {
    expect(findUnrewritable(`${body}\n`, NAMES)).toEqual([]);
  });

  it('does not flag a dynamic import of the subpath, or of the root with no pattern name', () => {
    expect(findUnrewritable(`const P = import('${SUB}').then((m) => m.Page);\n`, NAMES)).toEqual(
      [],
    );
    expect(findUnrewritable(`const { Button } = require('${ROOT}');\n`, NAMES)).toEqual([]);
  });
  it('ignores the subpath and named imports', () => {
    expect(
      findUnrewritable(`import * as P from '${SUB}';\nimport { A } from '${ROOT}';\n`),
    ).toEqual([]);
  });

  // hds#389 R1a fix round 2: the old scanner overflowed the stack on `<T>` casts.
  it('reads a 10,000-line file with 6,000 `<any>` casts in under a second', () => {
    const lines = [
      `import { Button, Page } from '${ROOT}';`,
      `const lazy = import('${ROOT}').then((m) => m.Button);`,
    ];
    for (let i = 0; i < 6000; i++) lines.push(`const w${i} = (<any>window).x${i};`);
    for (let i = 0; i < 2000; i++) lines.push(`const f${i} = <T>(x: T): T => x;`);
    while (lines.length < 10000) lines.push(`export const n${lines.length} = ${lines.length};`);
    const src = `${lines.join('\n')}\n`;
    const t0 = performance.now();
    const out = transformSource(src, NAMES);
    const manual = findUnrewritable(out.source, NAMES);
    const ms = performance.now() - t0;
    expect(out.moved).toEqual(['Page']);
    expect(manual).toEqual([]);
    expect(ms).toBeLessThan(1000);
  });
});

// hds#434: the transform matched raw source, so a comment in the braces or before
// the statement, or a second statement on the line, left a pattern name on the
// root import, and --check passed because a second run saw nothing to move.
describe('transformSource: comments and same-line statements (hds#434)', () => {
  it.each([
    [
      'a block comment after a specifier, before its comma',
      `import { Page /* c */, Button } from '${ROOT}';\n`,
      `import { Button } from '${ROOT}';\nimport { Page /* c */ } from '${SUB}';\n`,
    ],
    [
      'a block comment after the last specifier, with no comma',
      `import { Button, Page /* c */ } from '${ROOT}';\n`,
      `import { Button } from '${ROOT}';\nimport { Page /* c */ } from '${SUB}';\n`,
    ],
    [
      'a block comment holding a comma before a specifier',
      `import { Button, /* a, b */ Page } from '${ROOT}';\n`,
      `import { Button } from '${ROOT}';\nimport { /* a, b */ Page } from '${SUB}';\n`,
    ],
    [
      'a line comment after the last specifier, with no comma',
      `import {\n  Button,\n  Page // the shell\n} from '${ROOT}';\n`,
      `import {\n  Button,\n} from '${ROOT}';\nimport {\n  Page, // the shell\n} from '${SUB}';\n`,
    ],
    [
      'a block comment before the statement on its line',
      `/* eslint-disable */ import { Page } from '${ROOT}';\n`,
      `/* eslint-disable */ import { Page } from '${SUB}';\n`,
    ],
    [
      'another import before it on the same line, after ;',
      `import { A } from 'a'; import { Button, Page } from '${ROOT}';\n`,
      `import { A } from 'a'; import { Button } from '${ROOT}';\nimport { Page } from '${SUB}';\n`,
    ],
    [
      'a byte order mark before the first import',
      `﻿import { Page } from '${ROOT}';\n`,
      `﻿import { Page } from '${SUB}';\n`,
    ],
  ])('moves a pattern name past %s', (_label, src, want) => {
    const out = transformSource(src, NAMES);
    expect(out.source).toBe(want);
    expect(out.moved).toEqual(['Page']);
    expect(transformSource(out.source, NAMES).changed).toBe(false);
  });

  it('moves every pattern name of the hds#434 repro and keeps the group comments', () => {
    const src = `import {\n  // layout\n  Stack,\n  Page,\n  // forms\n  Form,\n} from '${ROOT}';\n`;
    const out = transformSource(src, new Set([...NAMES, 'Form']));
    expect(out.moved).toEqual(['Page', 'Form']);
    expect(out.source).toBe(
      `import {\n  // layout\n  Stack,\n} from '${ROOT}';\nimport {\n  Page,\n  // forms\n  Form,\n} from '${SUB}';\n`,
    );
  });

  it('keeps a comment after a comma with the specifier before it, and one before the brace with the root', () => {
    const src = `import {\n  Stack, // layout\n  Page, /* shell */\n  Button,\n  // more later\n} from '${ROOT}';\n`;
    expect(transformSource(src, NAMES).source).toBe(
      `import {\n  Stack, // layout\n  Button,\n  // more later\n} from '${ROOT}';\nimport {\n  Page, /* shell */\n} from '${SUB}';\n`,
    );
  });

  it('keeps comments inside a specifier and a type modifier', () => {
    const src = `import type { Button, Page /* p */ as Screen } from '${ROOT}';\n`;
    expect(transformSource(src, NAMES).source).toBe(
      `import type { Button } from '${ROOT}';\nimport type { Page /* p */ as Screen } from '${SUB}';\n`,
    );
  });

  it('treats an import inside a block comment or a template as text', () => {
    for (const src of [
      `/*\nimport { Page } from '${ROOT}';\n*/\n`,
      `const doc = \`\nimport { Page } from '${ROOT}';\n\`;\n`,
    ])
      expect(transformSource(src, NAMES).changed).toBe(false);
  });

  it('folds a statement into an existing /patterns import and keeps the comment before it', () => {
    const src = `/* eslint-disable */ import { Page } from '${ROOT}';\nimport { Reveal } from '${SUB}';\n`;
    expect(transformSource(src, NAMES).source).toBe(
      `/* eslint-disable */\nimport { Reveal, Page } from '${SUB}';\n`,
    );
  });

  it('merges a commented specifier into a single-line /patterns import on its own line', () => {
    const src = `import {\n  Button,\n  Page, // shell\n} from '${ROOT}';\nimport { Reveal } from '${SUB}';\n`;
    expect(transformSource(src, NAMES).source).toBe(
      `import {\n  Button,\n} from '${ROOT}';\nimport {\n  Reveal,\n  Page, // shell\n} from '${SUB}';\n`,
    );
  });
});

describe('transformSource: idempotence', () => {
  it('a second run changes nothing', () => {
    for (const src of [
      `import { Button, Page, TopNav } from '${ROOT}';\n`,
      `import {\n  AppShell,\n  SideNav as Nav,\n} from '${ROOT}';\nimport { Reveal } from '${SUB}';\n`,
      `import type { Toolbar } from '${ROOT}';\nexport { Page } from '${ROOT}';\n`,
    ]) {
      const once = transformSource(src, NAMES);
      expect(once.changed).toBe(true);
      const twice = transformSource(once.source, NAMES);
      expect(twice.changed).toBe(false);
      expect(twice.source).toBe(once.source);
    }
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-codemod-'));
    // Its own fixtures only: the other codemods' fixtures under codemods/__fixtures__
    // (hds-prefix, not-found-pattern, tile-grid) import root names on purpose.
    for (const own of ['needs-rewrite', 'clean'])
      cpSync(join(FIXTURES, own), join(dir, own), { recursive: true });
    // node_modules is gitignored, so the fixture is built here rather than committed.
    mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
    writeFileSync(join(dir, 'clean/node_modules/x/index.js'), `import { Page } from '${ROOT}';\n`);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) =>
    spawnSync('node', [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });

  it('--check exits 1 before a rewrite and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/mixed.tsx'), 'utf8');
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(readFileSync(join(dir, 'needs-rewrite/src/mixed.tsx'), 'utf8')).toBe(before);
  });

  it('--dry-run reports counts, exits 0 and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/mixed.tsx'), 'utf8');
    const r = run('--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/3 files/);
    expect(r.stdout).toMatch(/3 import sites/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/mixed.tsx'), 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0; node_modules is never touched', () => {
    expect(run().status).toBe(0);
    expect(readFileSync(join(dir, 'needs-rewrite/src/mixed.tsx'), 'utf8')).toContain(
      `import { Page, ErrorPattern } from '${SUB}'`,
    );
    expect(run('--check').status).toBe(0);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      `from '${ROOT}'`,
    );
  });

  it('--dry-run prints the before and after import lines', () => {
    const r = run('--dry-run');
    expect(r.stdout).toMatch(/^- import \{ .*Page.* \} from '@hirobius\/design-system';$/m);
    expect(r.stdout).toMatch(
      /^\+ import \{ .*Page.* \} from '@hirobius\/design-system\/patterns';$/m,
    );
  });

  it('--check exits 1 for a namespace import that reads a pattern name', () => {
    writeFileSync(
      join(dir, 'clean/ns.tsx'),
      `import * as HDS from '${ROOT}';\nexport const P = () => <HDS.Page />;\n`,
    );
    const r = run('--check', '--root', join(dir, 'clean'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(
      /ns\.tsx: import \* as HDS from '@hirobius\/design-system' \(uses Page\)/,
    );
  });

  it('--check exits 1 and names a require() of the root that uses a pattern name', () => {
    writeFileSync(join(dir, 'clean/cjs.cjs'), `const { Page } = require('${ROOT}');\n`);
    const r = run('--check', '--root', join(dir, 'clean'));
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cjs\.cjs: require\('@hirobius\/design-system'\) \(uses Page\)/);
  });

  // hds#389 R1a fix round 2 (review probe): the moved import plus a dynamic
  // import of the root for another name kept --check at exit 1 after a full run.
  it('a file that also lazy-loads the root reaches --check exit 0 after a real run; a second run is a no-op', () => {
    const file = join(dir, 'clean/src/lazy-mixed.tsx');
    writeFileSync(
      file,
      `import { Page, Button } from '${ROOT}';\nexport const L = () => import('${ROOT}').then((m) => m.Button);\nexport const M = () => <Page><Button /></Page>;\n`,
    );
    const root = join(dir, 'clean');
    expect(run('--check', '--root', root).status).toBe(1);
    expect(run('--root', root).status).toBe(0);
    const once = readFileSync(file, 'utf8');
    expect(once).toContain(`import { Page } from '${SUB}';`);
    const check = run('--check', '--root', root);
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
    expect(run('--root', root).stdout).toMatch(/rewrote 0 files/);
    expect(readFileSync(file, 'utf8')).toBe(once);
  });

  // hds#434 Done: --check exits 1 on the repro, and 0 after a real run.
  it('the hds#434 repro and every same-line form: --check exits 1, a real run moves all, then --check exits 0', () => {
    const root = join(dir, 'repro');
    mkdirSync(root);
    const files = {
      'group.tsx': `import {\n  // layout\n  Stack,\n  Page,\n  // forms\n  Form,\n} from '${ROOT}';\n`,
      'eslint.tsx': `/* eslint-disable */ import { Page } from '${ROOT}';\n`,
      'same-line.tsx': `import { useState } from 'react'; import { Form } from '${ROOT}';\n`,
      'bom.tsx': `﻿import { Reveal } from '${ROOT}';\n`,
      'trailing.tsx': `import { Stack, Page /* the shell */ } from '${ROOT}';\n`,
    };
    for (const [name, body] of Object.entries(files)) writeFileSync(join(root, name), body);
    expect(run('--check', '--root', root).status).toBe(1);
    expect(run('--root', root).status).toBe(0);
    const out = (name) => readFileSync(join(root, name), 'utf8');
    expect(out('group.tsx')).toBe(
      `import {\n  // layout\n  Stack,\n} from '${ROOT}';\nimport {\n  Page,\n  // forms\n  Form,\n} from '${SUB}';\n`,
    );
    expect(out('eslint.tsx')).toBe(`/* eslint-disable */ import { Page } from '${SUB}';\n`);
    expect(out('same-line.tsx')).toBe(
      `import { useState } from 'react'; import { Form } from '${SUB}';\n`,
    );
    expect(out('bom.tsx')).toBe(`﻿import { Reveal } from '${SUB}';\n`);
    expect(out('trailing.tsx')).toBe(
      `import { Stack } from '${ROOT}';\nimport { Page /* the shell */ } from '${SUB}';\n`,
    );
    const check = run('--check', '--root', root);
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
  });

  // hds#434: a file the detector cannot read to its end used to pass silently.
  it('--check exits 1 and names a file it cannot read to the end, before and after a real run', () => {
    const root = join(dir, 'unreadable');
    mkdirSync(root);
    writeFileSync(
      join(root, 'a.tsx'),
      `import { Button } from '${ROOT}';\nexport const A = () => <p>Matches src/*.ts</p>;\n`,
    );
    const r = run('--check', '--root', root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/a\.tsx: unreadable from line 2: a block comment never closes/);
    expect(r.stderr).not.toMatch(/by hand/);
    expect(run('--root', root).status).toBe(0);
    expect(run('--check', '--root', root).status).toBe(1);
  });

  it.each([
    ['a symlinked bin (npm/yarn .bin style)', 'file'],
    ['a symlinked package dir (pnpm style)', 'dir'],
  ])('still runs through %s: --check exits 1', (_label, kind) => {
    const link = join(dir, 'link');
    if (kind === 'file') symlinkSync(CODEMOD, link);
    else symlinkSync(join(REPO, 'codemods'), link);
    const entry = kind === 'file' ? link : join(link, 'patterns-subpath.mjs');
    const r = spawnSync('node', [entry, '--root', join(dir, 'needs-rewrite'), '--check'], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/rewrite needed/);
  });
});
