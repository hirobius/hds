/**
 * Tests for codemods/patterns-subpath.mjs (hds#316).
 * Seams: `transformSource` (pure) and the CLI (`--root`, `--check`, `--dry-run`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSource, loadPatternNames } from '../../codemods/patterns-subpath.mjs';
import { extractRootPatternNames } from '../build-codemod-pattern-names.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/patterns-subpath.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__');
const NAMES = new Set(['Page', 'TopNav', 'AppShell', 'SideNav', 'Toolbar', 'Reveal']);
const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';

describe('pattern name list', () => {
  it('is generated from the deprecated root aliases in src/index.ts, not hand-kept', () => {
    const fromSource = extractRootPatternNames(readFileSync(join(REPO, 'src/index.ts'), 'utf8'));
    expect([...loadPatternNames()].sort()).toEqual([...fromSource].sort());
    expect(fromSource).toContain('Page');
    expect(fromSource).not.toContain('Button');
    expect(fromSource.length).toBe(21);
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

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-codemod-'));
    cpSync(FIXTURES, dir, { recursive: true });
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
      `import { Page, TopNav } from '${SUB}'`,
    );
    expect(run('--check').status).toBe(0);
    expect(readFileSync(join(dir, 'clean/node_modules/x/index.js'), 'utf8')).toContain(
      `from '${ROOT}'`,
    );
  });
});
