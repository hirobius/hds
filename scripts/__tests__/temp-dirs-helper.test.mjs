/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#1008 — the shared temp-dir helper: each test file used to keep its own
 * tmpDirs array, makeTmp and afterAll sweep.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { useTempDirs } from './helpers/temp-dirs.mjs';

const made = [];
afterAll(() => {
  // vitest runs afterAll hooks last-registered first, so this runs after the sweep
  for (const d of made) expect(existsSync(d)).toBe(false);
});
const makeTmp = useTempDirs('temp-dirs-helper-');

describe('useTempDirs', () => {
  it('makes a fresh directory under the OS temp dir with the default prefix', () => {
    const dir = makeTmp();
    made.push(dir);
    expect(statSync(dir).isDirectory()).toBe(true);
    expect(path.dirname(dir)).toBe(path.resolve(os.tmpdir()));
    expect(path.basename(dir)).toMatch(/^temp-dirs-helper-/);
  });

  it('takes a per-call prefix, and every call is a new directory', () => {
    const a = makeTmp('other-');
    const b = makeTmp('other-');
    made.push(a, b);
    expect(path.basename(a)).toMatch(/^other-/);
    expect(a).not.toBe(b);
  });
});
