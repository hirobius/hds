/**
 * Shared test harness for the ledger codemods in codemods/*.mjs (hds#1008).
 * Every codemod has the same CLI contract (--root, --check, --dry-run, exit 2 on
 * an unknown flag) and the same package wiring, so those tests live here once.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CODEMODS } from '../../../codemods/registry.mjs';

export const REPO = resolve(fileURLToPath(import.meta.url), '../../../..');

/** Paths for codemods/<name>.mjs and its fixture tree. */
export function codemodPaths(name) {
  return {
    CODEMOD: join(REPO, `codemods/${name}.mjs`),
    FIXTURES: join(REPO, `codemods/__fixtures__/${name}`),
  };
}

/**
 * Registers beforeEach/afterEach that copy the fixtures into a fresh temp dir.
 * `only` copies just those fixture subdirectories; `decoy` writes
 * clean/node_modules/x/index.js, which the codemod must skip.
 * Returns a getter: call it inside a test to read the current dir.
 */
export function useFixtureDir(fixtures, prefix, { only, decoy } = {}) {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), prefix));
    if (only)
      for (const own of only) cpSync(join(fixtures, own), join(dir, own), { recursive: true });
    else cpSync(fixtures, dir, { recursive: true });
    // node_modules is gitignored, so the decoy is built here rather than committed.
    if (decoy !== undefined) {
      mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
      writeFileSync(join(dir, 'clean/node_modules/x/index.js'), decoy);
    }
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  return () => dir;
}

/** Runs the codemod CLI against `root`. */
export const runCli = (codemod, root, ...args) =>
  spawnSync('node', [codemod, '--root', root, ...args], { encoding: 'utf8' });

/**
 * The CLI contract every codemod shares. `checkFile` is a fixture file that
 * needs a rewrite; `dryRun` names a file and the -/+ lines --dry-run prints.
 */
export function describeCodemodCli({ name, prefix, checkFile, dryRun }) {
  const { CODEMOD, FIXTURES } = codemodPaths(name);
  describe('CLI', () => {
    const dir = useFixtureDir(FIXTURES, prefix);
    const run = (root, ...args) => runCli(CODEMOD, root, ...args);

    it('--check exits 1 when a rewrite is needed and writes nothing', () => {
      const file = join(dir(), checkFile);
      const before = readFileSync(file, 'utf8');
      const r = run(dir(), '--check');
      expect(r.status).toBe(1);
      expect(r.stderr).toContain(checkFile.split('/').pop());
      expect(readFileSync(file, 'utf8')).toBe(before);
    });

    it('--check exits 0 on a clean tree', () => {
      const r = run(join(dir(), 'clean'), '--check');
      expect(r.status).toBe(0);
      expect(r.stderr).toBe('');
    });

    it('--dry-run prints -/+ lines, exits 0 and writes nothing', () => {
      const file = join(dir(), dryRun.file);
      const before = readFileSync(file, 'utf8');
      const r = run(dir(), '--dry-run');
      expect(r.status).toBe(0);
      const lines = r.stdout.split('\n');
      expect(lines).toContain(dryRun.minus);
      expect(lines).toContain(dryRun.plus);
      expect(readFileSync(file, 'utf8')).toBe(before);
    });

    it('a real run rewrites, then --check exits 0 and a second run rewrites 0 files', () => {
      expect(run(dir()).status).toBe(0);
      expect(run(dir(), '--check').status).toBe(0);
      expect(run(dir()).stdout).toMatch(/rewrote 0 files/);
    });

    it('rejects an unknown argument with exit 2', () => {
      expect(run(dir(), '--nope').status).toBe(2);
    });
  });
}

/** Asserts the codemod is in the registry and in package.json#bin and #files. */
export function expectCodemodWired(name) {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
  const file = `${name}.mjs`;
  expect(CODEMODS[`hds-${name}`]).toEqual({ file });
  expect(pkg.bin[`hds-${name}`]).toBe(`codemods/${file}`);
  expect(pkg.files).toContain(`codemods/${file}`);
}
