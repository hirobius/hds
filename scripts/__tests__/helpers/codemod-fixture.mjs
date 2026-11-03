/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared helpers for the codemod tests in scripts/__tests__ (hds#1008).
 *
 * Each codemod test copied codemods/__fixtures__/<name> into a temp dir before
 * every test, planted a gitignored node_modules file under clean/, spawned the
 * codemod CLI with --root at the copy, and checked package.json shipped the
 * bin. This is that one copy; spawning goes through gate-runner's runGate.
 */
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ROOT, runGate } from './gate-runner.mjs';

/** Absolute paths to codemods/<name>.mjs and codemods/__fixtures__/<name>. */
export const codemodPaths = (name) => ({
  CODEMOD: join(ROOT, `codemods/${name}.mjs`),
  FIXTURES: join(ROOT, `codemods/__fixtures__/${name}`),
});

/**
 * Register beforeEach/afterEach that give each test a fresh temp copy of the
 * codemod's fixtures. `only` copies just those top-level dirs; `nodeModules`
 * is written to clean/node_modules/x/index.js (node_modules is gitignored).
 * Returns `{ dir, run(...args) }`; `run` spawns the CLI with `--root <dir>`
 * first, so a later `--root` in args overrides it.
 */
export function useCodemodFixture(name, { only, nodeModules } = {}) {
  const { CODEMOD, FIXTURES } = codemodPaths(name);
  const fx = {
    dir: undefined,
    run: (...args) => runGate(CODEMOD, ['--root', fx.dir, ...args]),
  };
  beforeEach(() => {
    fx.dir = mkdtempSync(join(tmpdir(), `hds-${name}-`));
    if (only) for (const d of only) cpSync(join(FIXTURES, d), join(fx.dir, d), { recursive: true });
    else cpSync(FIXTURES, fx.dir, { recursive: true });
    if (nodeModules !== undefined) {
      mkdirSync(join(fx.dir, 'clean/node_modules/x'), { recursive: true });
      writeFileSync(join(fx.dir, 'clean/node_modules/x/index.js'), nodeModules);
    }
  });
  afterEach(() => rmSync(fx.dir, { recursive: true, force: true }));
  return fx;
}

/** Assert package.json ships codemods/<name>.mjs as the hds-<name> bin and in #files. */
export function expectShipped(name) {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  expect(pkg.bin[`hds-${name}`]).toBe(`codemods/${name}.mjs`);
  expect(pkg.files).toContain(`codemods/${name}.mjs`);
}

/** A temp dir under `prefix` holding `files` ({ relPath: text }); left for the OS to sweep. */
export function tempTree(prefix, files) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

/** `it.each` that `transformSource` leaves each source as written, with no sites or edits. */
export function itLeavesAlone(transformSource, sources) {
  it.each(sources)('leaves %s alone', (src) => {
    const r = transformSource(src);
    expect(r.changed).toBe(false);
    expect(r.source).toBe(src);
    expect(r.sites).toBe(0);
    expect(r.edits).toEqual([]);
  });
}

/** `runCodemod` with the fixture's needs-rewrite dir skipped finds no files. */
export function itSkipsSkippedDir(runCodemod, fx) {
  it('does not enter a skipped directory', () => {
    const r = runCodemod({ root: fx.dir, skip: [join(fx.dir, 'needs-rewrite')] });
    expect(r.files).toEqual([]);
  });
}

/**
 * The CLI contract a fixture-driven codemod shares: --check on the
 * needs-rewrite and clean trees, --dry-run printing `dryRun` ([minus, plus]
 * lines of needs-rewrite/src/panel.css), a real run then a no-op rerun, and
 * exit 2 on an unknown argument.
 */
export function describeCodemodCli(name, { dryRun: [minus, plus] }) {
  describe('CLI', () => {
    const fx = useCodemodFixture(name);
    const run = (root, ...args) => fx.run('--root', root, ...args);

    it('--check exits 1 when a rewrite is needed and writes nothing', () => {
      const file = join(fx.dir, 'needs-rewrite/src/panel.tsx');
      const before = readFileSync(file, 'utf8');
      const r = run(fx.dir, '--check');
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/panel\.tsx/);
      expect(readFileSync(file, 'utf8')).toBe(before);
    });

    it('--check exits 0 on a clean tree', () => {
      const r = run(join(fx.dir, 'clean'), '--check');
      expect(r.status).toBe(0);
      expect(r.stderr).toBe('');
    });

    it('--dry-run prints -/+ lines, exits 0 and writes nothing', () => {
      const file = join(fx.dir, 'needs-rewrite/src/panel.css');
      const before = readFileSync(file, 'utf8');
      const r = run(fx.dir, '--dry-run');
      expect(r.status).toBe(0);
      const lines = r.stdout.split('\n');
      expect(lines).toContain(minus);
      expect(lines).toContain(plus);
      expect(readFileSync(file, 'utf8')).toBe(before);
    });

    it('a real run rewrites, then --check exits 0 and a second run rewrites 0 files', () => {
      expect(run(fx.dir).status).toBe(0);
      expect(run(fx.dir, '--check').status).toBe(0);
      expect(run(fx.dir).stdout).toMatch(/rewrote 0 files/);
    });

    it('rejects an unknown argument with exit 2', () => {
      expect(run(fx.dir, '--nope').status).toBe(2);
    });
  });
}
