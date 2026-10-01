/**
 * Tests for codemods/not-found-pattern.mjs (hds#395 B5, hds#389 decision update).
 *
 * 0.20.0 removes NotFoundPattern, a zero-prop wrapper that rendered
 * `<ErrorPattern displayText="404" message="Page not found" />`. The codemod
 * writes that element in its place, imported from `/patterns`.
 * Seams: `transformSource` (pure) and the CLI (`--root`, `--check`, `--dry-run`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
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
import { transformSource } from '../../codemods/not-found-pattern.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/not-found-pattern.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__/not-found-pattern');
const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';
const ELEMENT = 'displayText="404" message="Page not found"';

describe('transformSource', () => {
  it("rewrites ops' NotFoundPage: the element and an import from /patterns", () => {
    const src = `import { NotFoundPattern } from '${ROOT}';\n\nexport default function NotFoundPage() {\n  return <NotFoundPattern />;\n}\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(true);
    expect(out.sites).toBe(1);
    expect(out.manual).toEqual([]);
    expect(out.source).toBe(
      `import { ErrorPattern } from '${SUB}';\n\nexport default function NotFoundPage() {\n  return <ErrorPattern ${ELEMENT} />;\n}\n`,
    );
  });

  it('keeps the other root names and adds the /patterns import after the root one', () => {
    const src = `import { Button, NotFoundPattern } from "${ROOT}"\n<NotFoundPattern />;\n`;
    expect(transformSource(src).source).toBe(
      `import { Button } from "${ROOT}"\nimport { ErrorPattern } from "${SUB}"\n<ErrorPattern ${ELEMENT} />;\n`,
    );
  });

  it('joins an existing /patterns import and drops the emptied root import line', () => {
    const src = `import { NotFoundPattern } from '${ROOT}';\nimport { Page } from '${SUB}';\n<Page><NotFoundPattern /></Page>;\n`;
    expect(transformSource(src).source).toBe(
      `import { Page, ErrorPattern } from '${SUB}';\n<Page><ErrorPattern ${ELEMENT} /></Page>;\n`,
    );
  });

  it('joins a multi-line /patterns import on a line of its own', () => {
    const src = `import { Stack, NotFoundPattern } from '${ROOT}';\nimport {\n  Page, // the shell\n} from '${SUB}';\n<NotFoundPattern />;\n`;
    expect(transformSource(src).source).toBe(
      `import { Stack } from '${ROOT}';\nimport {\n  Page, // the shell\n  ErrorPattern,\n} from '${SUB}';\n<ErrorPattern ${ELEMENT} />;\n`,
    );
  });

  it('reuses an ErrorPattern the file already imports', () => {
    const src = `import { ErrorPattern, NotFoundPattern } from '${ROOT}';\n<ErrorPattern /><NotFoundPattern />;\n`;
    expect(transformSource(src).source).toBe(
      `import { ErrorPattern } from '${ROOT}';\n<ErrorPattern /><ErrorPattern ${ELEMENT} />;\n`,
    );
  });

  it('keeps an alias: the file goes on using its own name', () => {
    const src = `import { NotFoundPattern as Missing } from '${ROOT}';\n<Missing />;\n`;
    expect(transformSource(src).source).toBe(
      `import { ErrorPattern as Missing } from '${SUB}';\n<Missing ${ELEMENT} />;\n`,
    );
  });

  it('imports ErrorPattern under the old name when the file binds ErrorPattern to something else', () => {
    const src = `import { ErrorPattern } from './mine';\nimport { NotFoundPattern } from '${ROOT}';\n<NotFoundPattern /><ErrorPattern />;\n`;
    expect(transformSource(src).source).toBe(
      `import { ErrorPattern } from './mine';\nimport { ErrorPattern as NotFoundPattern } from '${SUB}';\n<NotFoundPattern ${ELEMENT} /><ErrorPattern />;\n`,
    );
  });

  it('keeps the attributes it is given (key) and renames an explicit closing tag', () => {
    const src = `import { NotFoundPattern } from '${ROOT}';\n<NotFoundPattern\n  key="404"\n></NotFoundPattern>;\n`;
    expect(transformSource(src).source).toBe(
      `import { ErrorPattern } from '${SUB}';\n<ErrorPattern\n  displayText="404"\n  message="Page not found"\n  key="404"\n></ErrorPattern>;\n`,
    );
  });

  it('keeps comments in the import braces', () => {
    const src = `import {\n  Stack,\n  NotFoundPattern, // the 404 route\n  Text,\n} from '${ROOT}';\n<NotFoundPattern />;\n`;
    expect(transformSource(src).source).toBe(
      `import {\n  Stack,\n  // the 404 route\n  Text,\n} from '${ROOT}';\nimport { ErrorPattern } from '${SUB}';\n<ErrorPattern ${ELEMENT} />;\n`,
    );
  });

  it('touches only imports from the package root', () => {
    for (const src of [
      `import { NotFoundPattern } from './local';\n<NotFoundPattern />;\n`,
      `import { NotFoundPattern } from '${ROOT}-extra';\n<NotFoundPattern />;\n`,
      `// import { NotFoundPattern } from '${ROOT}'\nconst s = "<NotFoundPattern />";\n`,
    ])
      expect(transformSource(src)).toMatchObject({ changed: false, source: src, manual: [] });
  });

  it.each([
    [
      'a spread, which could carry displayText or message',
      '<NotFoundPattern {...props} />;',
      /<NotFoundPattern> at line 2: a spread/,
    ],
    [
      'a displayText it ignored',
      '<NotFoundPattern displayText="Gone" />;',
      /<NotFoundPattern> at line 2: NotFoundPattern ignored displayText/,
    ],
    ['a value use', 'const C = NotFoundPattern;', /NotFoundPattern at line 2 is not a JSX tag/],
    ['a member tag', '<NotFoundPattern.Inner />;', /NotFoundPattern at line 2 is not a JSX tag/],
  ])('leaves the file as written and reports %s', (_label, body, report) => {
    const src = `import { NotFoundPattern } from '${ROOT}';\n${body}\n`;
    const out = transformSource(src);
    expect(out.changed).toBe(false);
    expect(out.source).toBe(src);
    expect(out.manual.join('\n')).toMatch(report);
  });

  it('reports a re-export, a type-only import and a namespace read', () => {
    expect(transformSource(`export { NotFoundPattern } from '${ROOT}';\n`).manual).toEqual([
      `export { NotFoundPattern } from '${ROOT}' (removed in 0.20.0; re-export ErrorPattern from '${SUB}' by hand)`,
    ]);
    expect(
      transformSource(`import type { NotFoundPattern } from '${ROOT}';\n`).manual,
    ).toHaveLength(1);
    expect(
      transformSource(`import * as HDS from '${ROOT}';\n<HDS.NotFoundPattern />;\n`).manual,
    ).toEqual([`import * as HDS from '${ROOT}' (uses NotFoundPattern)`]);
  });

  it('reports each changed line before and after for --dry-run', () => {
    const out = transformSource(
      `import { NotFoundPattern } from '${ROOT}';\n\n<NotFoundPattern />;\n`,
    );
    expect(out.edits).toEqual([
      {
        line: 1,
        before: [`import { NotFoundPattern } from '${ROOT}';`],
        after: [`import { ErrorPattern } from '${SUB}';`],
      },
      { line: 3, before: ['<NotFoundPattern />;'], after: [`<ErrorPattern ${ELEMENT} />;`] },
    ]);
  });

  it('is idempotent: a second run changes nothing and reports nothing', () => {
    for (const file of ['needs-rewrite/src/NotFoundPage.tsx', 'needs-rewrite/src/routes.tsx']) {
      const once = transformSource(readFileSync(join(FIXTURES, file), 'utf8'));
      expect(once.changed, file).toBe(true);
      const twice = transformSource(once.source);
      expect(twice.changed, file).toBe(false);
      expect(twice.manual, file).toEqual([]);
    }
  });
});

describe('the rewrite renders what NotFoundPattern rendered', () => {
  it('ErrorPattern with displayText="404" and message="Page not found"', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { ErrorPattern } = await import('../../src/app/components/error-pattern.tsx');
    const { NotFoundPattern } = await import('../../src/app/components/not-found-pattern.tsx');
    const rewritten = renderToStaticMarkup(
      React.createElement(ErrorPattern, { displayText: '404', message: 'Page not found' }),
    );
    expect(rewritten).toContain('404');
    expect(rewritten).toContain('Page not found');
    expect(rewritten).toBe(renderToStaticMarkup(React.createElement(NotFoundPattern)));
  });
});

describe('package', () => {
  it('ships the codemod as the hds-not-found-pattern bin', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(pkg.bin['hds-not-found-pattern']).toBe('codemods/not-found-pattern.mjs');
    expect(pkg.files).toContain('codemods/not-found-pattern.mjs');
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-not-found-'));
    cpSync(FIXTURES, dir, { recursive: true });
    // node_modules is gitignored, so the fixture is built here rather than committed.
    mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
    writeFileSync(
      join(dir, 'clean/node_modules/x/index.js'),
      `import { NotFoundPattern } from '${ROOT}';\n`,
    );
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) =>
    spawnSync('node', [CODEMOD, '--root', dir, ...args], { encoding: 'utf8' });

  it('--check exits 1 before a rewrite and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/NotFoundPage.tsx'), 'utf8');
    const r = run('--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/NotFoundPage\.tsx/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/NotFoundPage.tsx'), 'utf8')).toBe(before);
  });

  it('--dry-run reports counts and the changed lines, exits 0 and writes nothing', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/routes.tsx'), 'utf8');
    const r = run('--dry-run');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/would rewrite 2 files, 2 sites/);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-   return <NotFoundPattern />;');
    expect(lines).toContain(`+   return <ErrorPattern ${ELEMENT} />;`);
    expect(readFileSync(join(dir, 'needs-rewrite/src/routes.tsx'), 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0 and a second run is a no-op; clean files and node_modules are untouched', () => {
    const clean = readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8');
    expect(run().status).toBe(0);
    const page = readFileSync(join(dir, 'needs-rewrite/src/NotFoundPage.tsx'), 'utf8');
    expect(page).toContain(`import { ErrorPattern } from '${SUB}';`);
    expect(page).toContain(`return <ErrorPattern ${ELEMENT} />;`);
    const routes = readFileSync(join(dir, 'needs-rewrite/src/routes.tsx'), 'utf8');
    expect(routes).toContain(`import { Page, ErrorPattern as Missing } from '${SUB}';`);
    expect(routes).toContain('// the 404 route');
    expect(routes).toContain(`<Missing ${ELEMENT} key="404" />`);
    const check = run('--check');
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
    expect(run().stdout).toMatch(/rewrote 0 files/);
    expect(readFileSync(join(dir, 'needs-rewrite/src/routes.tsx'), 'utf8')).toBe(routes);
    expect(readFileSync(join(dir, 'clean/src/migrated.tsx'), 'utf8')).toBe(clean);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      `{ NotFoundPattern }`,
    );
  });

  it('--check exits 1 and lists a site it cannot rewrite, before and after a real run', () => {
    writeFileSync(
      join(dir, 'clean/src/spread.tsx'),
      `import { NotFoundPattern } from '${ROOT}';\nexport const P = (p: object) => <NotFoundPattern {...p} />;\n`,
    );
    const root = join(dir, 'clean');
    const r = run('--check', '--root', root);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/spread\.tsx: <NotFoundPattern> at line 2: a spread/);
    expect(run('--root', root).status).toBe(0);
    expect(run('--check', '--root', root).status).toBe(1);
  });

  it('runs through a symlinked bin (npm/yarn .bin style)', () => {
    const link = join(dir, 'link');
    symlinkSync(CODEMOD, link);
    const r = spawnSync('node', [link, '--root', join(dir, 'needs-rewrite'), '--check'], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/rewrite needed/);
  });

  it('rejects an unknown argument with exit 2', () => {
    expect(run('--write').status).toBe(2);
  });
});
