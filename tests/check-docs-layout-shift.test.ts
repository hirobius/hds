import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs helper
import { applyAllowlist, evaluateLayout } from '../scripts/lib/docs-layout-shift.mjs';

const box = { x: 0, y: 0, width: 100, height: 50 };
const scan = (route: string, cls = 0, header: typeof box | null = box) => ({
  route,
  cls,
  boxes: { header, sidebar: box, nav: box },
});

describe('evaluateLayout', () => {
  it('passes identical boxes and zero CLS', () => {
    expect(evaluateLayout([scan('/'), scan('/a')])).toEqual([]);
  });
  it('fails CLS above 0.01', () => {
    expect(evaluateLayout([scan('/', 0.02)])[0]).toMatchObject({ route: '/', kind: 'cls' });
  });
  it('fails a 1px header difference and a missing region', () => {
    const p = evaluateLayout([
      scan('/'),
      scan('/a', 0, { ...box, height: 51 }),
      scan('/b', 0, null),
    ]);
    expect(p.map((x: { route: string }) => x.route)).toEqual(['/a', '/b']);
  });
});

describe('applyAllowlist', () => {
  const entry = { route: '/', kind: 'cls', max: 0.05, reason: 'x', issue: 1 };
  it('waives a reading within max, blocks a worse one, flags stale entries', () => {
    const p = (cls: number) => ({ route: '/', kind: 'cls', cls, detail: '' });
    expect(applyAllowlist([p(0.04)], [entry]).blocking).toEqual([]);
    expect(applyAllowlist([p(0.06)], [entry]).blocking).toHaveLength(1);
    expect(applyAllowlist([], [entry]).stale).toEqual([]);
    expect(applyAllowlist([], [{ ...entry, kind: 'box' }]).stale).toHaveLength(1);
  });
});

describe('check-docs-layout-shift script (fixtures)', () => {
  const run = (d: string) =>
    spawnSync(
      'node',
      [
        'scripts/check-docs-layout-shift.mjs',
        '--dir',
        `fixtures/check-docs-layout-shift/${d}.example.d`,
        '--allowlist',
        'fixtures/check-docs-layout-shift/allowlist.empty.json',
      ],
      {
        encoding: 'utf8',
      },
    );
  it('passes the clean fixture', () => {
    const r = run('passing');
    expect(r.stdout + r.stderr).toContain('clean');
    expect(r.status).toBe(0);
  });
  it('fails the late-banner fixture', () => {
    const r = run('violating');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('[cls]');
    expect(r.stdout).toContain('[box]');
  });
}, 60000);
