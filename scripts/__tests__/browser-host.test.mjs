/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * browser-host resolves one Chromium for every test that drives one (hds#455):
 * PLAYWRIGHT_CHROMIUM_PATH, then Playwright's own build, then the newest
 * chromium-<rev> under PLAYWRIGHT_BROWSERS_PATH (/opt/pw-browsers). With
 * HDS_REQUIRE_BROWSER=1 a missing browser throws instead of skipping.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { chromiumPath, chromiumForTests } from '../lib/browser-host.mjs';

let root;
const exe = (rev, dir = 'chrome-linux64') => join(root, `chromium-${rev}`, dir, 'chrome');
const touch = (p) => {
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, '');
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'browser-host-'));
  touch(exe(1194, 'chrome-linux'));
  touch(exe(1243));
  mkdirSync(join(root, 'chromium'), { recursive: true }); // empty, like the image's
  mkdirSync(join(root, 'chromium_headless_shell-1300'), { recursive: true });
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

const nowhere = () => '/nope/playwright-chrome';

describe('chromiumPath', () => {
  it('prefers PLAYWRIGHT_CHROMIUM_PATH when it exists', () => {
    const pinned = exe(1194, 'chrome-linux');
    const env = { PLAYWRIGHT_CHROMIUM_PATH: pinned, PLAYWRIGHT_BROWSERS_PATH: root };
    expect(chromiumPath({ env, playwrightPath: () => exe(1243) })).toBe(pinned);
  });

  it('does not fall back past a pin that is missing', () => {
    const env = { PLAYWRIGHT_CHROMIUM_PATH: '/nope/chrome', PLAYWRIGHT_BROWSERS_PATH: root };
    expect(chromiumPath({ env, playwrightPath: () => exe(1243) })).toBeUndefined();
  });

  it("then uses Playwright's own build when it is installed", () => {
    const env = { PLAYWRIGHT_BROWSERS_PATH: root };
    expect(chromiumPath({ env, playwrightPath: () => exe(1194, 'chrome-linux') })).toBe(
      exe(1194, 'chrome-linux'),
    );
  });

  it('then takes the newest chromium-<rev> under PLAYWRIGHT_BROWSERS_PATH', () => {
    const env = { PLAYWRIGHT_BROWSERS_PATH: root };
    expect(chromiumPath({ env, playwrightPath: nowhere })).toBe(exe(1243));
  });

  it('finds <root>/chromium when it is a symlink to the binary, ignoring a directory', () => {
    const r = mkdtempSync(join(tmpdir(), 'browser-host-link-'));
    try {
      const env = { PLAYWRIGHT_BROWSERS_PATH: r };
      mkdirSync(join(r, 'chromium'));
      expect(chromiumPath({ env, playwrightPath: nowhere })).toBeUndefined();
      rmSync(join(r, 'chromium'), { recursive: true });
      const target = join(r, 'real-chrome');
      writeFileSync(target, '');
      symlinkSync(target, join(r, 'chromium'));
      expect(chromiumPath({ env, playwrightPath: nowhere })).toBe(join(r, 'chromium'));
      // a versioned build still wins over the symlink
      touch(join(r, 'chromium-5', 'chrome-linux64', 'chrome'));
      expect(chromiumPath({ env, playwrightPath: nowhere })).toBe(
        join(r, 'chromium-5', 'chrome-linux64', 'chrome'),
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it('returns undefined when nothing is installed', () => {
    const env = { PLAYWRIGHT_BROWSERS_PATH: join(root, 'missing') };
    expect(chromiumPath({ env, playwrightPath: nowhere })).toBeUndefined();
  });
});

describe('chromiumForTests', () => {
  const bad = { PLAYWRIGHT_CHROMIUM_PATH: '/nope/chrome', PLAYWRIGHT_BROWSERS_PATH: root };

  it('skips (undefined) without HDS_REQUIRE_BROWSER', () => {
    expect(chromiumForTests({ env: bad, playwrightPath: nowhere })).toBeUndefined();
  });

  it('throws, naming the ci.yml step order, with HDS_REQUIRE_BROWSER=1', () => {
    const env = { ...bad, HDS_REQUIRE_BROWSER: '1' };
    expect(() => chromiumForTests({ env, playwrightPath: nowhere })).toThrow(
      /HDS_REQUIRE_BROWSER=1[\s\S]*ci\.yml[\s\S]*Install Chromium[\s\S]*before[\s\S]*pnpm test/,
    );
  });

  it('returns the path when a browser is found, required or not', () => {
    const env = { PLAYWRIGHT_BROWSERS_PATH: root, HDS_REQUIRE_BROWSER: '1' };
    expect(chromiumForTests({ env, playwrightPath: nowhere })).toBe(exe(1243));
  });
});
