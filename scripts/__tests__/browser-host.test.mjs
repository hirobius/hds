import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chromiumPath } from '../lib/browser-host.mjs';

/** Lay out fake chromium-<build>/<dir>/chrome files under a temp browsers root. */
function fakeBuild(root, build, dir) {
  const p = path.join(root, `chromium-${build}`, dir);
  mkdirSync(p, { recursive: true });
  writeFileSync(path.join(p, 'chrome'), '');
  return path.join(p, 'chrome');
}

describe('chromiumPath', () => {
  let root;
  const keys = ['PLAYWRIGHT_BROWSERS_PATH', 'PLAYWRIGHT_CHROMIUM_PATH'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'pw-browsers-'));
    process.env.PLAYWRIGHT_BROWSERS_PATH = root;
    delete process.env.PLAYWRIGHT_CHROMIUM_PATH;
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('finds a chrome-linux64 build (newer image layout)', () => {
    expect(chromiumPath()).toBeUndefined();
    const chrome = fakeBuild(root, 1243, 'chrome-linux64');
    expect(chromiumPath()).toBe(chrome);
  });

  it('prefers the newest build by number, not by string order', () => {
    fakeBuild(root, 999, 'chrome-linux');
    const newest = fakeBuild(root, 1243, 'chrome-linux64');
    expect(chromiumPath()).toBe(newest);
  });

  it('lets PLAYWRIGHT_CHROMIUM_PATH win', () => {
    fakeBuild(root, 1243, 'chrome-linux64');
    const pinned = fakeBuild(root, 1194, 'chrome-linux');
    process.env.PLAYWRIGHT_CHROMIUM_PATH = pinned;
    expect(chromiumPath()).toBe(pinned);
  });
});
