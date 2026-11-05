/**
 * The focus radius rule, on the shipped token sheet (semantic.focus.*): for every
 * element radius the ring wraps, gapRadius = radius + semantic.focus.gap.width and
 * ringRadius = gapRadius + semantic.focus.ring.width. These are the steps Figma binds;
 * code draws the ring with outline, which applies the same rule to the live radius
 * (scripts/__tests__/focus-ring-computed.test.mjs measures it in Chromium). A radius or
 * width edit that leaves a focus step behind fails here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveVar, THEMES } from './helpers/token-sheet';

const px = (name: string) => {
  const v = resolveVar(name, 'light');
  if (v === '9999px') return Infinity; // radius.full: a pill stays a pill
  expect(v, name).toMatch(/^-?\d+(\.\d+)?px$/);
  return Number.parseFloat(v);
};
const GAP = '--semantic-focus-gap-width';
const RING = '--semantic-focus-ring-width';

/** [element radius var, focus token prefix, where it is used] */
const PAIRS: Array<[string, string, string]> = [
  ['--component-button-radius', '--component-button-focus', 'Button, Pagination, IconButton'],
  ['--component-input-radius', '--component-input-focus', 'Input, Textarea, Select trigger'],
  ['--component-card-radius', '--component-card-focus', 'Card asChild / selectable'],
  ['--component-tag-radius', '--component-tag-focus', 'Tag'],
  ['--semantic-radius-control', '--semantic-focus-radius-control', 'Checkbox glyph'],
  ['--semantic-radius-action', '--semantic-focus-radius-md', 'rounded-md (8px)'],
  ['--primitive-radius-full', '--semantic-focus-radius-pill', 'rounded-full'],
];

describe('focus tokens', () => {
  it('ring and gap are 2px, and the ring colour is the accent border in both themes', () => {
    expect(px(RING)).toBe(2);
    expect(px(GAP)).toBe(2);
    for (const theme of ['light', 'dark'] as const) {
      expect(resolveVar('--semantic-focus-ring-color', theme)).toBe(
        resolveVar('--semantic-color-border-accent', theme),
      );
    }
  });

  it.each(PAIRS)('%s: gapRadius = radius + gap, ringRadius = gapRadius + ring', (radius, focus) => {
    const r = px(radius);
    expect(px(`${focus}-gapRadius`)).toBe(r + px(GAP));
    expect(px(`${focus}-ringRadius`)).toBe(r + px(GAP) + px(RING));
  });

  it('the Tailwind rounded-sm / -lg steps match their focus steps (role.radius ∓)', () => {
    const md = px('--semantic-radius-action');
    expect(px('--semantic-focus-radius-sm-gapRadius')).toBe(md - 2 + px(GAP));
    expect(px('--semantic-focus-radius-sm-ringRadius')).toBe(md - 2 + px(GAP) + px(RING));
    expect(px('--semantic-focus-radius-lg-gapRadius')).toBe(md + 4 + px(GAP));
    expect(px('--semantic-focus-radius-lg-ringRadius')).toBe(md + 4 + px(GAP) + px(RING));
  });

  it('every focus radius aliases a real primitive radius step', () => {
    const focusVars = Object.keys(THEMES.light).filter((k) => /-focus.*-(gap|ring)Radius$/.test(k));
    expect(focusVars.length).toBeGreaterThanOrEqual(14);
    for (const name of focusVars)
      expect(THEMES.light[name], name).toMatch(/^var\(--primitive-radius-/);
  });
});

describe('focus ring CSS', () => {
  const css = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf8');
  it('one rule draws every ring from the focus tokens', () => {
    expect(css).toMatch(
      /outline:\s*var\(--semantic-focus-ring-width\)\s+solid\s+var\(--hds-focus-color, var\(--semantic-focus-ring-color\)\)/,
    );
    expect(css).toMatch(/outline-offset:\s*var\(--semantic-focus-gap-width\)/);
    expect(css).toMatch(/outline-offset:\s*calc\(-1 \* var\(--semantic-focus-ring-width\)\)/);
  });
  it('forced-colors keeps the ring in the system Highlight colour', () => {
    expect(css).toMatch(/@media \(forced-colors: active\)\s*\{[^@]*--hds-focus-color:\s*Highlight/);
  });
});

describe('focus ring in components', () => {
  const src = (f: string) =>
    readFileSync(resolve(__dirname, `../src/app/components/${f}.tsx`), 'utf8');
  it.each([
    'button',
    'input',
    'textarea',
    'select',
    'combobox',
    'checkbox',
    'radio',
    'toggle',
    'tabs',
    'menu',
    'nav-list',
    'card',
    'inline-link',
    'overlay-close',
    'table',
    'sheet',
    'token-field',
    'tag',
    'segmented-control',
  ])('%s uses the shared ring, not a Tailwind box-shadow ring', (f) => {
    const s = src(f);
    expect(s).toMatch(/hds-focus/);
    expect(s).not.toMatch(
      /(focus-visible|has-\[[^\]]*\]|data-\[highlighted\]):ring-(2|ring|offset|inset|destructive)/,
    );
    expect(s).not.toMatch(/outline-offset-2|borderWidth-emphasis\)_solid/);
  });
});
