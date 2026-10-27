import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs helper, no types
import { chromiumPath } from '../scripts/lib/browser-host.mjs';

const saved = process.env.PLAYWRIGHT_CHROMIUM_PATH;
afterEach(() => {
  if (saved === undefined) delete process.env.PLAYWRIGHT_CHROMIUM_PATH;
  else process.env.PLAYWRIGHT_CHROMIUM_PATH = saved;
});

describe('chromiumPath', () => {
  it('returns an existing executable named by the env var', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bh-')), 'chrome');
    fs.writeFileSync(file, '');
    process.env.PLAYWRIGHT_CHROMIUM_PATH = file;
    expect(chromiumPath()).toBe(file);
  });

  it('skips a candidate that is a directory (the old /opt/pw-browsers/chromium layout)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh-'));
    process.env.PLAYWRIGHT_CHROMIUM_PATH = dir;
    expect(chromiumPath()).not.toBe(dir);
  });
});
