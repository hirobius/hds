import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  globToRegExp,
  loadTestPatterns,
  isTestFile,
  isSourceFile,
} from '../check-tests-with-code.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'check-tests-with-code.mjs');

let cleanup = [];
afterEach(() => {
  for (const d of cleanup) rmSync(d, { recursive: true, force: true });
  cleanup = [];
});

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
    cwd,
    encoding: 'utf8',
  });

/** Scratch repo whose origin/main is the initial commit; `files` land on a feature branch. */
function repo({ files, messages = ['work'], withOrigin = true, baseFiles = [], deleteFiles = [] }) {
  const dir = mkdtempSync(join(tmpdir(), 'tests-with-code-'));
  cleanup.push(dir);
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'README.md'), 'x');
  for (const f of baseFiles) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), 'x');
  }
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'init');
  if (withOrigin) git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(dir, 'checkout', '-q', '-b', 'feature');
  files.forEach((f, i) => {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), 'x');
    git(dir, 'add', '.');
    git(dir, 'commit', '-q', '-m', messages[i] ?? messages[messages.length - 1]);
  });
  if (deleteFiles.length) {
    git(dir, 'rm', '-q', ...deleteFiles);
    git(dir, 'commit', '-q', '-m', 'remove');
  }
  return dir;
}

function run(cwd) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT], { cwd, encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

describe('patterns', () => {
  it('derives test patterns from vitest.config.ts', () => {
    const p = loadTestPatterns();
    expect(p.length).toBeGreaterThan(0);
    expect(isTestFile('scripts/__tests__/x.test.mjs', p)).toBe(true);
    expect(isTestFile('src/a/b.test.tsx', p)).toBe(true);
    expect(isTestFile('scripts/x.mjs', p)).toBe(false);
  });
  it('globToRegExp handles ** and braces', () => {
    expect(globToRegExp('src/**/*.{ts,tsx}').test('src/a/b/c.tsx')).toBe(true);
    expect(globToRegExp('src/**/*.{ts,tsx}').test('lib/c.ts')).toBe(false);
  });
  it('classifies source files', () => {
    const p = loadTestPatterns();
    expect(isSourceFile('src/a.mjs', p)).toBe(true);
    expect(isSourceFile('scripts/x.ts', p)).toBe(true);
    expect(isSourceFile('docs/a.md', p)).toBe(false);
    expect(isSourceFile('src/data.json', p)).toBe(false);
    expect(isSourceFile('scripts/__tests__/a.test.mjs', p)).toBe(false);
    expect(isSourceFile('scripts/fixtures/a.mjs', p)).toBe(false);
    expect(isSourceFile('README.md', p)).toBe(false);
  });
  it('counts only code extensions as source', () => {
    const p = loadTestPatterns();
    for (const f of ['src/a.js', 'src/a.mjs', 'src/a.cjs', 'src/a.ts', 'src/a.tsx', 'src/a.jsx'])
      expect(isSourceFile(f, p)).toBe(true);
    for (const f of ['src/a.css', 'src/a.html', 'scripts/a.sh', 'api/a.svg', 'src/a.png'])
      expect(isSourceFile(f, p)).toBe(false);
  });
});

describe('check-tests-with-code', () => {
  it('source + test -> pass', () => {
    const r = run(repo({ files: ['src/a.mjs', 'scripts/__tests__/a.test.mjs'] }));
    expect(r.code).toBe(0);
    expect(r.out.trim().split('\n').length).toBeLessThanOrEqual(3);
  });
  it('source only -> fail, lists files and hint', () => {
    const r = run(repo({ files: ['src/a.mjs', 'scripts/b.ts'] }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('src/a.mjs');
    expect(r.out).toContain('scripts/b.ts');
    expect(r.out).toContain('no-test: <reason>');
  });
  it('lists at most 10 source files', () => {
    const files = Array.from({ length: 12 }, (_, i) => `src/f${String(i).padStart(2, '0')}.mjs`);
    const r = run(repo({ files }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('src/f09.mjs');
    expect(r.out).not.toContain('src/f10.mjs');
    expect(r.out).toContain('+2 more');
  });
  it('docs only -> pass', () => {
    const r = run(repo({ files: ['docs/a.md', 'src/data.json'] }));
    expect(r.code).toBe(0);
  });
  it('no-test: line -> pass and prints reason', () => {
    const r = run(repo({ files: ['src/a.mjs'], messages: ['fix\n\nno-test: copy tweak only'] }));
    expect(r.code).toBe(0);
    expect(r.out).toContain('copy tweak only');
  });
  it('no origin/main -> skip with one line', () => {
    const r = run(repo({ files: ['src/a.mjs'], withOrigin: false }));
    expect(r.code).toBe(0);
    expect(r.out.trim().split('\n')).toHaveLength(1);
    expect(r.out).toMatch(/skip/i);
  });
  it('failure output is exactly one line in the agreed format', () => {
    const r = run(repo({ files: ['src/a.mjs', 'scripts/b.ts'] }));
    expect(r.code).toBe(1);
    expect(r.out.trim().split('\n')).toHaveLength(1);
    expect(r.out.trim()).toBe(
      'check-tests-with-code: 2 source file(s) changed, no test changed: scripts/b.ts, src/a.mjs — add/adjust a test, or add a commit line "no-test: <reason>"',
    );
  });
  it('pure deletion of source -> pass', () => {
    const r = run(repo({ files: [], baseFiles: ['src/old.mjs'], deleteFiles: ['src/old.mjs'] }));
    expect(r.code).toBe(0);
  });
  it('non-code file under lib -> pass', () => {
    expect(run(repo({ files: ['src/a.css', 'src/b.svg'] })).code).toBe(0);
  });
});

describe('fixture mode (proof-of-firing)', () => {
  const fx = (name) => {
    try {
      const out = execFileSync('node', [SCRIPT, '--fixture-mode'], {
        cwd: ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          FIXTURE_FILE: join(ROOT, 'fixtures', 'check-tests-with-code', name),
        },
      });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status ?? 1, out: (e.stdout ?? '') + (e.stderr ?? '') };
    }
  };
  it('passing.example.json -> exit 0', () => {
    expect(fx('passing.example.json').code).toBe(0);
  });
  it('violating.example.json -> exit 1', () => {
    expect(fx('violating.example.json').code).toBe(1);
  });
});
