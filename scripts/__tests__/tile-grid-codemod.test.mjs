/**
 * Tests for codemods/tile-grid.mjs (hds#395 B5, hds#389 decision update).
 *
 * 0.20.0 removes TileGrid; Grid renders its recipe since hds#393 (B3):
 * `<TileGrid minTileWidth gap>` becomes
 * `<Grid layout="auto-fill" minItemWidth gap="medium">`. TileGrid defaulted to
 * 260px tiles on a fixed 12px gap ('sm'); Grid defaults to 280px and 32px, so
 * the codemod always writes both. scripts/__tests__/grid-tile-grid-parity.test.mjs
 * renders each rewrite and compares it with TileGrid in Chromium.
 * Seams: `transformSource` (pure) and the CLI (`--root`, `--check`, `--dry-run`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { transformSource } from '../../codemods/tile-grid.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/tile-grid.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__/tile-grid');
const ROOT = '@hirobius/design-system';

const one = (body, imports = `import { TileGrid } from '${ROOT}';`) =>
  transformSource(`${imports}\n${body}\n`);

describe('transformSource', () => {
  it("rewrites ops' ClientDashboardPage shape: the import name and every tag", () => {
    const src = `import { Page, Stack, Badge, Callout, TileGrid, EmptyState } from '${ROOT}';\n<TileGrid minTileWidth="280px">\n  <i />\n</TileGrid>;\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(true);
    expect(out.sites).toBe(1);
    expect(out.manual).toEqual([]);
    expect(out.source).toBe(
      `import { Page, Stack, Badge, Callout, Grid, EmptyState } from '${ROOT}';\n<Grid layout="auto-fill" minItemWidth="280px" gap="medium">\n  <i />\n</Grid>;\n`,
    );
  });

  it("maps gap 'sm' (12px) to Grid's fixed 12px 'medium'", () => {
    expect(one('<TileGrid minTileWidth="260px" gap="sm"><i /></TileGrid>;').source).toContain(
      '<Grid layout="auto-fill" minItemWidth="260px" gap="medium"><i /></Grid>;',
    );
    expect(one("<TileGrid gap='sm' minTileWidth='9rem'><i /></TileGrid>;").source).toContain(
      `<Grid gap='medium' layout="auto-fill" minItemWidth='9rem'><i /></Grid>;`,
    );
  });

  it("writes TileGrid's defaults, which Grid does not share: 260px tiles on a 12px gap", () => {
    expect(one('<TileGrid><i /></TileGrid>;').source).toContain(
      '<Grid layout="auto-fill" minItemWidth="260px" gap="medium"><i /></Grid>;',
    );
  });

  it("keeps an expression width and falls back to TileGrid's 260px when it is undefined", () => {
    expect(one('<TileGrid minTileWidth={w}><i /></TileGrid>;').source).toContain(
      `<Grid layout="auto-fill" minItemWidth={w ?? '260px'} gap="medium"><i /></Grid>;`,
    );
    expect(one('<TileGrid minTileWidth={a.b || c}><i /></TileGrid>;').source).toContain(
      `<Grid layout="auto-fill" minItemWidth={(a.b || c) ?? '260px'} gap="medium"><i /></Grid>;`,
    );
  });

  // TypeScript 6 rejects `x ?? y` when x can never be nullish (TS2869) or always
  // is (TS2871), and judges that from the syntax alone. A width that is never
  // undefined never took TileGrid's fallback, so it goes through as written.
  it.each([
    ['a string literal', `{'280px'}`],
    ['a double-quoted literal in parentheses', `{("280px")}`],
    ['a template literal', '{`${n}px`}'],
    ['a template literal with a nested template', '{`${c ? `${n}px` : "1px"}`}'],
    ['a conditional with literal branches', `{c ? '200px' : '300px'}`],
    ['nested conditionals with literal branches', '{c ? (d ? `${n}px` : "1px") : \'300px\'}'],
    ['a literal with a comment', `{/* wide */ '280px'}`],
    ['a nullish fallback to a literal', `{w ?? '200px'}`],
    ['a conditional on a cast test', `{w as unknown as boolean ? '200px' : '300px'}`],
  ])('writes %s through as it is: it is never undefined', (_label, value) => {
    const out = one(`<TileGrid minTileWidth=${value}><i /></TileGrid>;`);
    expect(out.manual).toEqual([]);
    expect(out.source).toContain(
      `<Grid layout="auto-fill" minItemWidth=${value} gap="medium"><i /></Grid>;`,
    );
  });

  it.each([
    ['a member access', '{theme.tile}', `{theme.tile ?? '260px'}`],
    ['an optional chain', '{theme?.tile}', `{theme?.tile ?? '260px'}`],
    ['a non-null assertion', '{w!}', `{w! ?? '260px'}`],
    ['a call', `{width('tile')}`, `{width('tile') ?? '260px'}`],
    ['an element access', '{sizes[k]}', `{sizes[k] ?? '260px'}`],
    ['a nullish fallback to a name', '{w ?? v}', `{(w ?? v) ?? '260px'}`],
    ['a tagged template', '{css`1px`}', "{css`1px` ?? '260px'}"],
    [
      'an expression after a comment',
      `{/* tile */ c ? w : '1px'}`,
      `{/* tile */ (c ? w : '1px') ?? '260px'}`,
    ],
    ['an expression before a line comment', '{w // tile\n}', `{w ?? '260px' // tile\n}`],
    ['a conditional with a nullable branch', `{c ? w : '300px'}`, `{(c ? w : '300px') ?? '260px'}`],
    [
      'a conditional with an undefined branch',
      `{c ? undefined : '300px'}`,
      `{(c ? undefined : '300px') ?? '260px'}`,
    ],
    [
      'a conditional whose test compares',
      `{n >= 4 ? w : '300px'}`,
      `{(n >= 4 ? w : '300px') ?? '260px'}`,
    ],
  ])("keeps TileGrid's 260px fallback for %s, which can be undefined", (_label, value, written) => {
    const out = one(`<TileGrid minTileWidth=${value}><i /></TileGrid>;`);
    expect(out.manual).toEqual([]);
    expect(out.source).toContain(
      `<Grid layout="auto-fill" minItemWidth=${written} gap="medium"><i /></Grid>;`,
    );
  });

  it.each([
    [
      'undefined',
      '{undefined}',
      /minTileWidth=\{undefined\} is always null or undefined.*minItemWidth="260px"/,
    ],
    ['null', '{null}', /always null or undefined/],
    [
      'a conditional with only undefined branches',
      '{c ? undefined : null}',
      /always null or undefined/,
    ],
    [
      'a concatenation',
      `{n + 'px'}`,
      /cannot tell whether minTileWidth=\{n \+ 'px'\} can be undefined/,
    ],
    ['a cast', '{w as string}', /cannot tell/],
    ['an arrow function', '{() => w}', /cannot tell/],
    ['an assignment', '{w = v}', /cannot tell/],
    ['a comma expression', '{(a, w)}', /cannot tell/],
    ['an empty expression', '{/* none */}', /cannot tell/],
  ])('leaves the file as written and lists %s for a manual edit', (_label, value, report) => {
    const src = `import { TileGrid } from '${ROOT}';\n<TileGrid minTileWidth=${value}><i /></TileGrid>;\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(false);
    expect(out.source).toBe(src);
    expect(out.manual.join('\n')).toMatch(report);
  });

  it('keeps every other attribute, comment and layout as written; the Grid props sit together', () => {
    const src = `import { TileGrid } from '${ROOT}';\n<TileGrid\n  className="rail" /* tiles */\n  minTileWidth="200px"\n  style={{ marginTop: 8 }}\n  aria-label="Tiles"\n>\n  {items.map((i) => <b key={i}>{i > 2 ? 'big' : 'small'}</b>)}\n</TileGrid>;\n`;
    expect(transformSource(src).source).toBe(
      `import { Grid } from '${ROOT}';\n<Grid\n  className="rail" /* tiles */\n  layout="auto-fill"\n  minItemWidth="200px"\n  gap="medium"\n  style={{ marginTop: 8 }}\n  aria-label="Tiles"\n>\n  {items.map((i) => <b key={i}>{i > 2 ? 'big' : 'small'}</b>)}\n</Grid>;\n`,
    );
  });

  it('rewrites nested grids and counts each tag', () => {
    const out = one('<TileGrid><TileGrid gap="sm"><i /></TileGrid></TileGrid>;');
    expect(out.sites).toBe(2);
    expect(out.source).toContain(
      '<Grid layout="auto-fill" minItemWidth="260px" gap="medium"><Grid layout="auto-fill" minItemWidth="260px" gap="medium"><i /></Grid></Grid>;',
    );
  });

  it('drops the import name when the file already imports Grid from the root', () => {
    expect(
      one('<TileGrid><Grid><i /></Grid></TileGrid>;', `import { Grid, TileGrid } from '${ROOT}';`)
        .source,
    ).toBe(
      `import { Grid } from '${ROOT}';\n<Grid layout="auto-fill" minItemWidth="260px" gap="medium"><Grid><i /></Grid></Grid>;\n`,
    );
    expect(
      one(
        '<TileGrid><Grid><i /></Grid></TileGrid>;',
        `import { Grid } from '${ROOT}';\nimport { TileGrid } from '${ROOT}';`,
      ).source,
    ).toBe(
      `import { Grid } from '${ROOT}';\n<Grid layout="auto-fill" minItemWidth="260px" gap="medium"><Grid><i /></Grid></Grid>;\n`,
    );
  });

  it('keeps an alias, and the old name when the file binds Grid to something else', () => {
    expect(
      one('<Tiles><i /></Tiles>;', `import { TileGrid as Tiles } from '${ROOT}';`).source,
    ).toBe(
      `import { Grid as Tiles } from '${ROOT}';\n<Tiles layout="auto-fill" minItemWidth="260px" gap="medium"><i /></Tiles>;\n`,
    );
    expect(
      one(
        '<TileGrid><Grid /></TileGrid>;',
        `import { Grid } from './Grid';\nimport { TileGrid } from '${ROOT}';`,
      ).source,
    ).toBe(
      `import { Grid } from './Grid';\nimport { Grid as TileGrid } from '${ROOT}';\n<TileGrid layout="auto-fill" minItemWidth="260px" gap="medium"><Grid /></TileGrid>;\n`,
    );
  });

  it('touches only imports from the package root, and text that only names TileGrid', () => {
    for (const src of [
      `import { TileGrid } from './local';\n<TileGrid />;\n`,
      `import { TileGrid } from '${ROOT}/patterns';\n<TileGrid />;\n`,
      `// import { TileGrid } from '${ROOT}'\nconst s = '<TileGrid minTileWidth="1px">';\n`,
    ])
      expect(transformSource(src)).toMatchObject({ changed: false, source: src, manual: [] });
  });

  it.each([
    ['gap="xs"', '<TileGrid gap="xs"><i /></TileGrid>;', /gap="xs": .*8px/],
    ['gap="md"', '<TileGrid gap="md"><i /></TileGrid>;', /gap="md": .*16px/],
    ['an expression gap', '<TileGrid gap={g}><i /></TileGrid>;', /gap=\{g\}/],
    ['a spread', '<TileGrid {...p}><i /></TileGrid>;', /a spread can carry minTileWidth or gap/],
    ['a self-closing tag', '<TileGrid minTileWidth="1px" />;', /Grid needs children/],
    ['a value use', 'createElement(TileGrid, null);', /TileGrid at line 3 is not a JSX tag/],
    ['a typeof', 'type T = typeof TileGrid;', /TileGrid at line 3 is not a JSX tag/],
    ['a member tag', '<TileGrid.Item />;', /TileGrid at line 3 is not a JSX tag/],
    [
      'JSX text that names it',
      '<p>Use a TileGrid here</p>;',
      /TileGrid at line 3 is not a JSX tag/,
    ],
  ])('leaves the file as written and reports %s', (_label, body, report) => {
    const src = `import { TileGrid } from '${ROOT}';\n<TileGrid><i /></TileGrid>;\n${body}\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(false);
    expect(out.source).toBe(src);
    expect(out.manual.join('\n')).toMatch(report);
  });

  it('reports a re-export, TileGridProps and a namespace read', () => {
    expect(transformSource(`export { TileGrid } from '${ROOT}';\n`).manual).toEqual([
      `export { TileGrid } from '${ROOT}' (removed in 0.20.0; re-export Grid by hand)`,
    ]);
    const props = transformSource(
      `import { TileGrid, type TileGridProps } from '${ROOT}';\n<TileGrid><i /></TileGrid>;\n`,
    );
    expect(props.source).toContain('<Grid layout="auto-fill"');
    expect(props.manual).toEqual([
      `TileGridProps from '${ROOT}' (removed in 0.20.0, use GridProps: minTileWidth is minItemWidth, gap 'sm' is 'medium')`,
    ]);
    expect(transformSource(`import * as HDS from '${ROOT}';\n<HDS.TileGrid />;\n`).manual).toEqual([
      `import * as HDS from '${ROOT}' (uses TileGrid)`,
    ]);
  });

  it('is idempotent: a second run changes nothing and reports nothing', () => {
    for (const file of [
      'needs-rewrite/src/ClientDashboard.tsx',
      'needs-rewrite/src/SurfacesRail.tsx',
    ]) {
      const once = transformSource(readFileSync(join(FIXTURES, file), 'utf8'));
      expect(once.changed, file).toBe(true);
      const twice = transformSource(once.source);
      expect(twice.changed, file).toBe(false);
      expect(twice.manual, file).toEqual([]);
    }
  });
});

// ── The rewrite typechecks ────────────────────────────────────────────────────

/**
 * The package as the fixture sees it: TileGrid with the props 0.19.1 shipped
 * (src/app/components/tile-grid.tsx at a4dfa2e, removed in 0.20.0), next to the
 * real Grid. Never written to disk: the compiler host serves it.
 */
const PACKAGE_STUB = `import * as React from 'react';
export { Grid } from '../app/components/grid';
export interface TileGridProps extends React.HTMLAttributes<HTMLDivElement> {
  minTileWidth?: string;
  gap?: 'xs' | 'sm' | 'md';
}
export declare const TileGrid: React.ForwardRefExoticComponent<
  TileGridProps & React.RefAttributes<HTMLDivElement>
>;
`;

/** Each file's TypeScript errors, under the repo's tsconfig, with the package resolved to the stub. */
function typecheck(files) {
  const dir = join(REPO, 'src/__tile-grid-typecheck__');
  const stub = join(dir, 'index.ts');
  const virtual = new Map([
    [stub, PACKAGE_STUB],
    ...Object.entries(files).map(([name, text]) => [join(dir, name), text]),
  ]);
  const config = ts.readConfigFile(join(REPO, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, REPO);
  options.noEmit = true;
  options.paths = { ...options.paths, [ROOT]: [stub] };
  const host = ts.createCompilerHost(options);
  const { fileExists, readFile, getSourceFile } = host;
  host.fileExists = (f) => virtual.has(f) || fileExists.call(host, f);
  host.readFile = (f) => virtual.get(f) ?? readFile.call(host, f);
  host.getSourceFile = (f, lang, ...rest) =>
    virtual.has(f)
      ? ts.createSourceFile(f, virtual.get(f), lang)
      : getSourceFile.call(host, f, lang, ...rest);
  const names = Object.keys(files);
  const program = ts.createProgram(
    names.map((name) => join(dir, name)),
    options,
    host,
  );
  return Object.fromEntries(
    names.map((name) => {
      const sf = program.getSourceFile(join(dir, name));
      const errors = [
        ...program.getSyntacticDiagnostics(sf),
        ...program.getSemanticDiagnostics(sf),
      ];
      return [
        name,
        errors.map(
          (e) =>
            `TS${e.code} at line ${sf.getLineAndCharacterOfPosition(e.start ?? 0).line + 1}: ${ts.flattenDiagnosticMessageText(e.messageText, ' ')}`,
        ),
      ];
    }),
  );
}

describe('the rewrite typechecks (TypeScript 6 rejects `??` on a width that is never undefined)', () => {
  it('every width the fixture holds typechecks with TileGrid before the rewrite and with Grid after it', () => {
    const before = readFileSync(join(FIXTURES, 'typecheck/src/ExpressionWidths.tsx'), 'utf8');
    const out = transformSource(before);
    expect(out.manual).toEqual([]);
    expect(out.sites).toBe(18);
    expect(out.source).not.toMatch(/<\/?TileGrid\b|\{ TileGrid \}/);
    expect(typecheck({ 'before.tsx': before, 'after.tsx': out.source })).toEqual({
      'before.tsx': [],
      'after.tsx': [],
    });
    expect(out.source).toContain(`<Grid layout="auto-fill" minItemWidth={'280px'} gap="medium">`);
    expect(out.source).toContain(
      `<Grid layout="auto-fill" minItemWidth={c ? '200px' : '300px'} gap="medium">`,
    );
    expect(out.source).toContain(
      `<Grid layout="auto-fill" minItemWidth={w ?? '260px'} gap="medium">`,
    );
  }, 60_000);

  it('would catch the error: `??` on a literal width is TS2869', () => {
    const src = `import { Grid } from '${ROOT}';\nexport const X = () => <Grid minItemWidth={('280px') ?? '260px'}><i /></Grid>;\n`;
    expect(typecheck({ 'probe.tsx': src })['probe.tsx'].join('\n')).toMatch(/^TS2869 at line 2/);
  }, 60_000);
});

describe('package', () => {
  it('ships the codemod as the hds-tile-grid bin', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(pkg.bin['hds-tile-grid']).toBe('codemods/tile-grid.mjs');
    expect(pkg.files).toContain('codemods/tile-grid.mjs');
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-tile-grid-'));
    // The CLI fixtures only: typecheck/ is read by the typecheck test above.
    for (const own of ['needs-rewrite', 'clean'])
      cpSync(join(FIXTURES, own), join(dir, own), { recursive: true });
    // node_modules is gitignored, so the fixture is built here rather than committed.
    mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
    writeFileSync(
      join(dir, 'clean/node_modules/x/index.js'),
      `import { TileGrid } from '${ROOT}';\n`,
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) =>
    spawnSync('node', [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });

  it('--check exits 1 before a rewrite and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/SurfacesRail.tsx'), 'utf8');
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/SurfacesRail\.tsx: 1 site/);
    expect(r.stderr).toMatch(/ClientDashboard\.tsx: 2 sites/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/SurfacesRail.tsx'), 'utf8')).toBe(before);
  });

  it('--dry-run reports counts and the changed lines, exits 0 and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/ClientDashboard.tsx'), 'utf8');
    const r = run('--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/would rewrite 2 files, 3 sites/);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-       <TileGrid minTileWidth="260px" gap="sm">');
    expect(lines).toContain('+       <Grid layout="auto-fill" minItemWidth="260px" gap="medium">');
    expect(readFileSync(join(dir, 'needs-rewrite/src/ClientDashboard.tsx'), 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0 and a second run is a no-op; clean files and node_modules are untouched', () => {
    const clean = readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8');
    expect(run().status).toBe(0);
    const page = readFileSync(join(dir, 'needs-rewrite/src/ClientDashboard.tsx'), 'utf8');
    expect(page).toContain(`import { Page, Stack, Badge, Grid, EmptyState } from '${ROOT}';`);
    expect(page).toContain(
      '<Grid key={lane.id} layout="auto-fill" minItemWidth="280px" gap="medium">',
    );
    expect(page).not.toMatch(/TileGrid/);
    const check = run('--check');
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
    expect(run().stdout).toMatch(/rewrote 0 files/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/ClientDashboard.tsx'), 'utf8')).toBe(page);
    expect(readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8')).toBe(clean);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      '{ TileGrid }',
    );
  });

  it('--check exits 1 and lists a site it cannot rewrite, before and after a real run', () => {
    writeFileSync(
      join(dir, 'clean/src/xs.tsx'),
      `import { TileGrid } from '${ROOT}';\nexport const X = () => <TileGrid gap="xs"><i /></TileGrid>;\n`,
    );
    const root = join(dir, 'clean');
    const r = run('--check', '--root', root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/xs\.tsx: <TileGrid> at line 2: gap="xs"/);
    expect(run('--root', root).status).toBe(0);
    expect(run('--check', '--root', root).status).toBe(1);
  });
});
