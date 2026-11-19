/**
 * A colour utility must not reset background-image. utilities.css wrote .bg-transparent as
 * the `background` shorthand, which also set background-image to none, so the
 * SegmentedControl's selected fill-and-edge gradient never painted (its indicator carries
 * bg-transparent as its colour layer). Tailwind's own bg-transparent is background-color.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'utilities.css'), 'utf8');

function body(selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, `${selector} is in utilities.css`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at));
}

describe('utilities.css colour utilities', () => {
  it.each(['.bg-transparent', '.bg-current'])('%s sets background-color only', (selector) => {
    const rule = body(selector);
    expect(rule).toMatch(/background-color:/);
    expect(rule).not.toMatch(/(^|[\s{;])background:/);
  });
});
