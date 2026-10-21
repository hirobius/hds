/**
 * SegmentedControl secondary selected-segment contrast (hds#866).
 *
 * The secondary selected segment must read against its track at 3:1 or more
 * (WCAG 1.4.11 non-text) in light and dark, with the control on the page and on
 * a raised Card. The colors come from the rendered classes (which custom
 * properties the indicator and rail actually paint) resolved against the shipped
 * token sheet: `dist/variables.css` is `src/styles/tokens.generated.css` verbatim
 * plus a banner (scripts/build-vars-css.mjs).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { contrastRatio } from '../utils/colorUtils';
import { SegmentedControl } from './segmented-control';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(cleanup);

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.generated.css'), 'utf8');

/** The custom-property declarations of the first block opened by `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block in the token sheet`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) vars[m[1]] = m[2].trim();
  return vars;
}

const ROOT = block(':root');
const THEMES = { light: ROOT, dark: { ...ROOT, ...block('[data-theme="dark"]') } } as const;

/** Resolve a custom property to a hex colour in a theme. */
function color(name: string, theme: keyof typeof THEMES): string {
  let value = THEMES[theme][name];
  while (value?.startsWith('var(')) value = THEMES[theme][value.slice(4, -1).trim()];
  if (!value?.startsWith('#')) throw new Error(`${name} (${theme}) does not resolve to a hex`);
  return value;
}

/** The custom property a Tailwind arbitrary class paints, e.g. bg-[var(--x)] → --x. */
function paintedVar(className: string, pattern: RegExp): string {
  const m = className.match(pattern);
  if (!m) throw new Error(`no ${pattern} in "${className}"`);
  return m[1];
}

function renderSecondary() {
  render(
    <SegmentedControl
      aria-label="View"
      variant="secondary"
      value="grid"
      onChange={() => {}}
      options={[
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
      ]}
    />,
  );
  const rail = screen.getByRole('radiogroup');
  const selected = screen.getByRole('radio', { name: 'Grid' });
  const indicator = selected.querySelector('[aria-hidden="true"]') as HTMLElement;
  return {
    track: paintedVar(rail.className, /\bbg-\[var\((--[\w-]+)\)\]/),
    fill: paintedVar(indicator.className, /\bbg-\[var\((--[\w-]+)\)\]/),
    edge: paintedVar(indicator.className, /inset_0_0_0_1px_var\((--[\w-]+)\)/),
    label: paintedVar(selected.className, /\btext-\[var\((--[\w-]+)\)\]/),
  };
}

const SURFACES = ['--semantic-color-surface-page', '--semantic-color-surface-raised'] as const;

describe('SegmentedControl secondary selected segment contrast (hds#866)', () => {
  for (const theme of ['light', 'dark'] as const) {
    // The rail paints its own fill, so the track is the same on the page and on a Card.
    it(`the selected edge reads against the track at 3:1 or more (${theme})`, () => {
      const { track, edge } = renderSecondary();
      expect(contrastRatio(color(edge, theme), color(track, theme))).toBeGreaterThanOrEqual(3);
    });

    for (const surface of SURFACES) {
      const on = surface.endsWith('raised') ? 'a raised Card' : 'the page';
      it(`the selected edge reads against ${on} at 3:1 or more (${theme})`, () => {
        const { edge } = renderSecondary();
        expect(contrastRatio(color(edge, theme), color(surface, theme))).toBeGreaterThanOrEqual(3);
      });
    }

    // The label is weight 500 (hds-type-ui), not bold, so it needs the 4.5:1 body-text bar.
    it(`the label reads on the selected fill at 4.5:1 or more (${theme})`, () => {
      const { fill, label } = renderSecondary();
      expect(contrastRatio(color(label, theme), color(fill, theme))).toBeGreaterThanOrEqual(4.5);
    });
  }
});
