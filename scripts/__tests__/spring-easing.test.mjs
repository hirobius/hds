/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#751 — a spring token becomes a CSS `linear()` curve. CSS has no
 * `spring()` function, so the old output made every declaration that used it
 * invalid; these tests pin the replacement.
 */
import { describe, expect, it } from 'vitest';
import { springToLinear, simulateSpring } from '../lib/spring-easing.mjs';

const points = (css) =>
  css
    .replace(/^linear\(|\)$/g, '')
    .split(',')
    .map(Number);

describe('simulateSpring', () => {
  it('overshoots about 11% for the expressive spring (300, 20, 1)', () => {
    const { peak } = simulateSpring({ stiffness: 300, damping: 20, mass: 1 });
    expect(peak).toBeGreaterThan(1.09);
    expect(peak).toBeLessThan(1.13);
  });

  it('never overshoots when critically damped or more', () => {
    const k = 400;
    const { peak } = simulateSpring({ stiffness: k, damping: 2 * Math.sqrt(k), mass: 1 });
    expect(peak).toBeLessThanOrEqual(1.0005);
  });

  it('settles sooner when stiffer', () => {
    const soft = simulateSpring({ stiffness: 300, damping: 31.2, mass: 1 }).settleMs;
    const stiff = simulateSpring({ stiffness: 1400, damping: 67.3, mass: 1 }).settleMs;
    expect(stiff).toBeLessThan(soft);
  });

  it('refuses a spring that cannot settle', () => {
    expect(() => simulateSpring({ stiffness: 300, damping: 0, mass: 1 })).toThrow(/damping/);
    expect(() => simulateSpring({ stiffness: 0, damping: 10, mass: 1 })).toThrow(/stiffness/);
  });
});

describe('springToLinear', () => {
  it('is valid linear() that starts at 0 and ends at 1', () => {
    const { easing } = springToLinear({ stiffness: 300, damping: 20, mass: 1 });
    expect(easing).toMatch(/^linear\(0(, -?\d+(\.\d+)?)+\)$/);
    const p = points(easing);
    expect(p[0]).toBe(0);
    expect(p.at(-1)).toBe(1);
    expect(Math.max(...p)).toBeGreaterThan(1.05);
  });

  it('is deterministic and compact', () => {
    const a = springToLinear({ stiffness: 700, damping: 47.6, mass: 1 });
    const b = springToLinear({ stiffness: 700, damping: 47.6, mass: 1 });
    expect(a).toEqual(b);
    expect(points(a.easing).length).toBeLessThanOrEqual(41);
    expect(a.settleMs % 10).toBe(0);
  });
});
