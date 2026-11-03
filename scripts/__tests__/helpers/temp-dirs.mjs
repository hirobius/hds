/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared temp directories for the tests in scripts/__tests__ (hds#1008).
 *
 * Call once at module level: it registers an afterAll that removes every
 * directory it made, and returns `makeTmp(prefix?)`. `useTempDirsPerTest`
 * is the same with an afterEach, for tests that sweep after every test.
 */
import { afterAll, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function useTempDirs(defaultPrefix = 'hds-test-') {
  const dirs = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });
  return (prefix = defaultPrefix) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
    dirs.push(dir);
    return dir;
  };
}

export function useTempDirsPerTest(defaultPrefix = 'hds-test-') {
  let dirs = [];
  afterEach(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
    dirs = [];
  });
  return (prefix = defaultPrefix) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
    dirs.push(dir);
    return dir;
  };
}
