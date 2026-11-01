/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Shared scaffolding for the eval-* and explorations tests (hds#1011): temp
 * dirs that clean up after the file, and the eval-consistency CLI runner.
 */
import { afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Returns `makeTmp(prefix?)`; every dir it makes is removed when the file's tests finish. */
export function useTmpDirs(defaultPrefix) {
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

/** Runs scripts/eval-consistency.mjs; returns its exit code and stdout+stderr. */
export function runEvalCli(args) {
  const r = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/eval-consistency.mjs'), ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
