/**
 * codemods/patterns-subpath.mjs and the names 0.20.0 removed with no replacement
 * (codemods/removed-0.20.json: hds#389 R1's docs/lab components, hds#394 wave 4a
 * and the root `*Variants` helpers).
 *
 * The codemod moves names to `/patterns`; a removed name has nowhere to move, so
 * it must be reported for a manual edit ("removed in 0.20.0, no replacement")
 * instead of being left on the root import, where `--check` would pass and the
 * consumer's build would break on upgrade.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRemoved, loadRemovedNames, runCodemod } from '../../codemods/patterns-subpath.mjs';
import { collectPublicApi } from '../lib/check-public-api.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/patterns-subpath.mjs');
const DATA = JSON.parse(readFileSync(join(REPO, 'codemods/removed-0.20.json'), 'utf8'));
const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';

describe('codemods/removed-0.20.json', () => {
  const surface = collectPublicApi(REPO);
  const exported = new Set(
    Object.entries(surface.modules)
      .filter(([key]) => !key.startsWith('@subpath/') || key === '@subpath/patterns')
      .flatMap(([, names]) => names),
  );

  it('lists no name the root or /patterns still exports', () => {
    const back = [...loadRemovedNames()].filter((name) => exported.has(name));
    expect(back).toEqual([]);
  });

  it('keys every name by its module: a deleted file, or a kept one whose *Variants went private', () => {
    for (const [file, names] of Object.entries(DATA.modules)) {
      if (existsSync(join(REPO, file))) {
        expect(
          names.filter((n) => !n.endsWith('Variants')),
          file,
        ).toEqual([]);
      }
    }
  });

  it('covers the 32 wave 4a components, the five R1 docs/lab components and a root *Variants helper', () => {
    const names = loadRemovedNames();
    for (const name of [
      'ActivityFeed',
      'AppShell',
      'ButtonGroup',
      'Calendar',
      'CaseStudyLayout',
      'Carousel',
      'CommandPalette',
      'ContextMenu',
      'DateInput',
      'DateRangeInput',
      'DateTimeInput',
      'DocLinkCard',
      'ErrorBoundary',
      'FileInput',
      'HdsDocsShell',
      'HdsSystemDocLayout',
      'HeadingStack',
      'HistoryCard',
      'HoverCard',
      'Lightbox',
      'NavGroup',
      'NavItem',
      'OverflowList',
      'SideNav',
      'StackedCardRail',
      'Stepper',
      'StepperField',
      'TextLockup',
      'Tokenizer',
      'Toolbar',
      'TopNav',
      'TreeList',
      'CinematicLink',
      'ComponentInstanceMatrix',
      'FoundationSwatch',
      'Sketch',
      'Token',
      'buttonVariants',
    ]) {
      expect(names.has(name), name).toBe(true);
    }
    // Moved or renamed, not removed: the other codemods handle these.
    for (const name of ['Page', 'FormField', 'Button', 'HdsCheckbox']) {
      expect(names.has(name), name).toBe(false);
    }
  });
});

describe('packaging', () => {
  it('ships codemods/removed-0.20.json, which the published bin reads at run time', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(pkg.files).toContain('codemods/removed-0.20.json');
  });
});

describe('findRemoved', () => {
  it('reports a removed name imported from the root or from /patterns', () => {
    const src = [
      `import { Button, ActivityFeed } from '${ROOT}';`,
      `import { Page, SideNav as Nav } from '${SUB}';`,
      `import type { buttonVariants } from "${ROOT}";`,
    ].join('\n');
    expect(findRemoved(src)).toEqual([
      `ActivityFeed from '${ROOT}' (removed in 0.20.0, no replacement)`,
      `SideNav from '${SUB}' (removed in 0.20.0, no replacement)`,
      `buttonVariants from '${ROOT}' (removed in 0.20.0, no replacement)`,
    ]);
  });

  it('reports multi-line imports and re-exports', () => {
    const src = `import {\n  Card,\n  HoverCard,\n} from '${ROOT}';\nexport { Toolbar } from '${SUB}';\n`;
    expect(findRemoved(src)).toEqual([
      `HoverCard from '${ROOT}' (removed in 0.20.0, no replacement)`,
      `Toolbar from '${SUB}' (removed in 0.20.0, no replacement)`,
    ]);
  });

  // hds#434: findRemoved read raw source, so a comment in the braces or before the
  // statement, or a second statement on the line, hid a removed name and --check passed.
  it.each([
    [
      'a block comment after it, before its comma',
      `import { Toolbar /* c */, Button } from '${ROOT}';`,
    ],
    [
      'a block comment after it, with no comma',
      `import { Button, Toolbar /* c */ } from '${ROOT}';`,
    ],
    [
      'a block comment holding a comma before it',
      `import { Button, /* a, b */ Toolbar } from '${ROOT}';`,
    ],
    ['a // group line before it', `import {\n  Button,\n  // nav\n  Toolbar,\n} from '${ROOT}';`],
    [
      'a line comment after it, with no comma',
      `import {\n  Button,\n  Toolbar // nav\n} from '${ROOT}';`,
    ],
    [
      'a block comment before the statement',
      `/* eslint-disable */ import { Toolbar } from '${ROOT}';`,
    ],
    [
      'another import before it after ;',
      `import { A } from 'a'; import { Toolbar } from '${ROOT}';`,
    ],
    ['a byte order mark', `﻿import { Toolbar } from '${ROOT}';`],
  ])('reports a removed name past %s', (_label, src) => {
    expect(findRemoved(`${src}\n`)).toEqual([
      `Toolbar from '${ROOT}' (removed in 0.20.0, no replacement)`,
    ]);
  });

  it('ignores an import inside a block comment or a template', () => {
    expect(findRemoved(`/*\nimport { Toolbar } from '${ROOT}';\n*/\n`)).toEqual([]);
    expect(findRemoved(`const doc = \`\nimport { Toolbar } from '${ROOT}';\n\`;\n`)).toEqual([]);
  });

  it('ignores kept names, other packages, comments and strings', () => {
    const src = [
      `import { Button, Menu } from '${ROOT}';`,
      `import { Page } from '${SUB}';`,
      `import { Calendar } from 'lucide-react';`,
      `import { Calendar as CalendarIcon } from '${ROOT}/icons';`,
      `// import { ActivityFeed } from '${ROOT}';`,
      `const s = "import { Toolbar } from '${ROOT}'";`,
    ].join('\n');
    expect(findRemoved(src)).toEqual([]);
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-codemod-removed-'));
    mkdirSync(join(dir, 'src'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) =>
    spawnSync('node', [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });

  it('--check exits 1 and names a removed import for a manual edit', () => {
    writeFileSync(join(dir, 'src/a.tsx'), `import { Button, ActivityFeed } from '${ROOT}';\n`);
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(
      /a\.tsx: ActivityFeed from '@hirobius\/design-system' \(removed in 0\.20\.0, no replacement\)/,
    );
  });

  it('a real run moves pattern names, leaves a removed name where it is and reports it', () => {
    const file = join(dir, 'src/a.tsx');
    writeFileSync(file, `import { Page, TopNav } from '${ROOT}';\n`);
    const r = run();
    expect(r.status).toBe(0);
    expect(readFileSync(file, 'utf8')).toBe(
      `import { TopNav } from '${ROOT}';\nimport { Page } from '${SUB}';\n`,
    );
    expect(r.stderr).toMatch(
      /a\.tsx: TopNav from '@hirobius\/design-system' \(removed in 0\.20\.0/,
    );
    expect(run('--check').status).toBe(1);
  });

  it('runCodemod checks every file against one removed-name set, passed in like `names`', () => {
    // runCodemod takes the removed-name set as a parameter, like `names`, and checks
    // every scanned file against the set it is given. This proves the injection only;
    // that the default set is read once per run (a default parameter) is not observed.
    for (const f of ['a', 'b', 'c'])
      writeFileSync(join(dir, `src/${f}.tsx`), `import { Button, Toolbar } from '${ROOT}';\n`);
    const res = runCodemod({ root: dir, removed: new Set(['Button']) });
    expect(res.manual.map((m) => m.stmt)).toEqual(
      Array(3).fill(`Button from '${ROOT}' (removed in 0.20.0, no replacement)`),
    );
  });

  it('--check exits 0 for a file with no removed and no pattern name', () => {
    writeFileSync(join(dir, 'src/a.tsx'), `import { Button } from '${ROOT}';\n`);
    expect(run('--check').status).toBe(0);
  });
});
