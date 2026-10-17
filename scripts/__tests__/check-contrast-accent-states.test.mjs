import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const run = () => {
  try {
    return execFileSync('node', ['scripts/check-contrast.mjs'], { cwd: root }).toString();
  } catch (e) {
    return String(e.stdout) + String(e.stderr);
  }
};

describe('accent state contrast gate (hds#748)', () => {
  it('holds onAccent text at AA on accent rest, hover and pressed in both modes', () => {
    const out = run();
    for (const state of ['rest', 'hover', 'pressed']) {
      const rows = out.split('\n').filter((l) => l.includes(`content.onAccent / accent.${state}`));
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).not.toMatch(/FAIL/i);
    }
  });

  it('passes the whole contrast gate', () => {
    expect(() => execFileSync('node', ['scripts/check-contrast.mjs'], { cwd: root })).not.toThrow();
  });
});

describe('dark accent state ordering (hds#748)', () => {
  it('lightens step by step: hover > rest, pressed > hover, each at least 1.1:1 apart', async () => {
    const { readFileSync } = await import('node:fs');
    const t = JSON.parse(readFileSync(resolve(root, 'hirobius.tokens.json'), 'utf8'));
    const prim = t.primitive.color.graphite;
    const hex = (ref) => prim[ref.match(/graphite\.(\d+)/)[1]].$value;
    const lum = (h) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const L = (n) => lum(hex(t.semantic.accent[n].$extensions['com.figma.variables'].modes.Dark));
    const ratio = (a, b) => (a + 0.05) / (b + 0.05);
    const [rest, hover, pressed] = [L('rest'), L('hover'), L('pressed')];
    expect(hover).toBeGreaterThan(rest);
    expect(pressed).toBeGreaterThan(hover);
    expect(ratio(hover, rest)).toBeGreaterThanOrEqual(1.1);
    expect(ratio(pressed, hover)).toBeGreaterThanOrEqual(1.1);
  });
});
