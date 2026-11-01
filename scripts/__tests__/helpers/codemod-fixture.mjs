/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared helpers for the codemod tests in scripts/__tests__ (hds#1008).
 *
 * Each codemod test copied codemods/__fixtures__/<name> into a temp dir before
 * every test, planted a gitignored node_modules file under clean/, spawned the
 * codemod CLI with --root at the copy, and checked package.json shipped the
 * bin. This is that one copy; spawning goes through gate-runner's runGate.
 */
import { beforeEach, afterEach, expect } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
