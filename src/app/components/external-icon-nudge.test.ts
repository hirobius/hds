/**
 * hds#1530 / hds#751: the external-link arrow's nudge (InlineLink and Button).
 * It must animate, in and out, not jump between two positions: the transition is
 * declared on the resting icon (not only on :hover), the shift is a translate
 * (never top/left/margin, so nothing reflows), it uses the productive motion
 * token, and reduced motion never applies it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const theme = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const block = (open: string) => {
  const start = theme.indexOf(open);
  expect(start, `${open} in theme.css`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = theme.indexOf('{', start); i < theme.length; i++) {
    if (theme[i] === '{') depth++;
    if (theme[i] === '}' && --depth === 0) return theme.slice(start, i + 1);
  }
  throw new Error('unbalanced');
};

describe('external icon nudge CSS', () => {
  it('is unlayered: index.css has an unlayered transition on every [data-hds] descendant, which beats any @layer rule', () => {
    const at = theme.indexOf('.hds-ext-icon {');
    let depth = 0;
    let layered = false;
    for (let i = 0; i < at; i++) {
      if (theme[i] === '{') depth++;
      if (theme[i] === '}') depth--;
    }
    layered = depth !== 0;
    expect(layered).toBe(false);
  });

  it('declares the transition on the resting icon, on the productive token', () => {
    const rest = block('.hds-ext-icon {');
    expect(rest).toContain('transition: translate var(--hds-motion-productive)');
  });

  it('shifts with translate only: up and right, never top, left or margin', () => {
    const moved = block('@media (prefers-reduced-motion: no-preference)');
    expect(moved).toContain('translate: 0.125em -0.125em');
    expect(moved).not.toMatch(/\b(top|left|right|bottom|margin[\w-]*|transform)\s*:/);
  });

  it('applies the shift on focus-visible, and on hover only for hover-capable pointers', () => {
    const moved = block('@media (prefers-reduced-motion: no-preference)');
    expect(moved).toContain('.hds-ext:focus-visible .hds-ext-icon');
    expect(block('@media (hover: hover)')).toContain('.hds-ext:hover .hds-ext-icon');
  });

  it('never applies the shift outside no-preference, so reduced motion does not move', () => {
    const all = theme.match(/translate:\s*0\.125em -0\.125em/g) ?? [];
    const gated =
      block('@media (prefers-reduced-motion: no-preference)').match(
        /translate:\s*0\.125em -0\.125em/g,
      ) ?? [];
    expect(all.length).toBe(gated.length);
  });
});
