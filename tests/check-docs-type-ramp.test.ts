import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs helper
import { chromiumForTests } from '../scripts/lib/browser-host.mjs';
// @ts-expect-error plain .mjs helper
import { firstFamily, loadRamp, matchRole } from '../scripts/lib/docs-type-ramp.mjs';

const ramp = loadRamp();
const sora = 'Sora, system-ui, sans-serif';
const style = (fontSize: string, lineHeight: string, fontWeight: string, family = sora) => ({
  fontSize,
  lineHeight,
  fontWeight,
  family,
});

describe('loadRamp', () => {
  it('reads the nine roles from the token file', () => {
    expect(Object.keys(ramp)).toEqual([
      'display',
      'title',
      'titleSm',
      'body',
      'bodyStrong',
      'ui',
      'uiRegular',
      'caption',
      'mono',
    ]);
    expect(ramp.body).toMatchObject({ size: 18, weight: 400, lineHeight: 1.6, family: 'sora' });
    expect(ramp.mono.family).toBe('ibm plex mono');
  });
});

describe('matchRole', () => {
  it('matches a role on family, size, weight and line height together', () => {
    expect(matchRole(style('18px', '28.8px', '400'), ramp)).toBe('body');
    expect(matchRole(style('18px', '28.8px', '700'), ramp)).toBe('bodyStrong');
    expect(matchRole(style('14px', '21px', '400'), ramp)).toBe('caption');
    expect(matchRole(style('15px', '22.5px', '400', '"IBM Plex Mono", monospace'), ramp)).toBe(
      'mono',
    );
  });
  it('rejects Fumadocs defaults: 16px at 28px, 14px at 20px, 600 and 500 weights', () => {
    expect(matchRole(style('16px', '28px', '400'), ramp)).toBeNull();
    expect(matchRole(style('14px', '20px', '400'), ramp)).toBeNull();
    expect(matchRole(style('16px', '24px', '600'), ramp)).toBeNull();
    expect(matchRole(style('14px', '21px', '500'), ramp)).toBeNull();
    expect(matchRole(style('16px', 'normal', '400'), ramp)).toBeNull();
  });
  it('rejects a right size in the wrong family', () => {
    expect(matchRole(style('16px', '24px', '400', 'Arial, sans-serif'), ramp)).toBeNull();
  });
  it('lets display run between its fluid floor and its size, and no further', () => {
    expect(matchRole(style('48px', '50.4px', '700'), ramp)).toBe('display');
    expect(matchRole(style('36px', '37.8px', '700'), ramp)).toBeNull();
  });
  it('reads the next/font face the docs site names `sans` as Sora', () => {
    expect(firstFamily('sans, "sans Fallback", Sora')).toBe('sora');
    expect(matchRole(style('16px', '24px', '400', 'sans, "sans Fallback", Sora'), ramp)).toBe('ui');
  });
});

// The fixture runs drive a real browser; skip where none is installed (fails under HDS_REQUIRE_BROWSER=1).
const hasBrowser = Boolean(chromiumForTests());

describe.skipIf(!hasBrowser)(
  'check-docs-type-ramp script (fixtures)',
  () => {
    const run = (d: string) =>
      spawnSync(
        'node',
        [
          'scripts/check-docs-type-ramp.mjs',
          '--dir',
          `fixtures/check-docs-type-ramp/${d}.example.d`,
          '--routes',
          '/',
        ],
        { encoding: 'utf8' },
      );
    it('passes the on-ramp fixture', () => {
      const r = run('passing');
      expect(r.stdout + r.stderr).toContain('on the ramp');
      expect(r.status).toBe(0);
    });
    it('fails the off-ramp fixture and names the element and its values', () => {
      const r = run('violating');
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('17px/27.2px 400');
      expect(r.stdout).toContain('off-ramp gap');
    });
  },
  120000,
);
