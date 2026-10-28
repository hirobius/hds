import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs helper
import { chromiumPath } from '../scripts/lib/browser-host.mjs';
// @ts-expect-error plain .mjs helper
import { evaluateTargets, validateTargets } from '../scripts/lib/docs-touch-targets.mjs';

const scan = (boxes: { label: string; width: number; height: number }[]) => ({
  route: '/docs/components/button',
  name: 'Button sm',
  min: 44,
  boxes,
});

describe('evaluateTargets', () => {
  it('passes a control at the touch minimum', () => {
    expect(evaluateTargets([scan([{ label: 'Save', width: 64, height: 44 }])])).toEqual([]);
  });
  it('tolerates subpixel rounding', () => {
    expect(evaluateTargets([scan([{ label: 'X', width: 43.8, height: 43.8 }])])).toEqual([]);
  });
  it('fails a short or narrow control and names the axis', () => {
    const p = evaluateTargets([
      scan([
        { label: 'Save', width: 64, height: 32 },
        { label: 'X', width: 30, height: 44 },
      ]),
    ]);
    expect(p.map((x: { detail: string }) => x.detail)).toEqual([
      '"Save" height 32 < 44px',
      '"X" width 30 < 44px',
    ]);
  });
  it('fails a selector that matched nothing', () => {
    expect(evaluateTargets([scan([])])[0].detail).toBe('selector matched nothing');
  });
});

describe('validateTargets', () => {
  it('rejects an empty list and a missing field', () => {
    expect(validateTargets([])).toHaveLength(1);
    expect(validateTargets([{ route: '/a', name: 'a' }])).toEqual([
      'targets[0].selector must be a string',
    ]);
  });
});

// The fixture runs drive a real browser; skip where none is installed (CI's lean gate has none).
const browser: string | undefined = chromiumPath() ?? chromium.executablePath();
const hasBrowser = Boolean(browser) && existsSync(browser as string);

describe.skipIf(!hasBrowser)(
  'check-docs-touch-targets script (fixtures)',
  () => {
    const run = (d: string) =>
      spawnSync(
        'node',
        [
          'scripts/check-docs-touch-targets.mjs',
          '--dir',
          `fixtures/check-docs-touch-targets/${d}.example.d`,
          '--targets',
          'fixtures/check-docs-touch-targets/targets.json',
        ],
        { encoding: 'utf8' },
      );
    it('passes the 48px fixture', () => {
      const r = run('passing');
      expect(r.stdout + r.stderr).toContain('clean');
      expect(r.status).toBe(0);
    });
    it('fails the 32px fixture', () => {
      const r = run('violating');
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('height 32 < 44px');
    });
  },
  60000,
);
