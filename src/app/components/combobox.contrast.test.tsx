/**
 * Combobox chip hover contrast (hds#522, "shadcn tokens next to --semantic-*").
 *
 * A selection chip rests on one fill and must change fill on hover in light and
 * dark. It rested on `bg-muted` (surface.overlay, #f5f5f5) and hovered to
 * `bg-accent` (surface.accentSubtle, #f5f4f4): the same colour in light, so the
 * hover did nothing. The colours come from the rendered classes resolved against
 * the shipped token sheet, the way segmented-control.contrast.test.tsx does it.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { contrastRatio } from '../utils/colorUtils';
import { Combobox, type ComboboxOption } from './combobox';

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

function color(name: string, theme: keyof typeof THEMES): string {
  let value = THEMES[theme][name];
  while (value?.startsWith('var(')) value = THEMES[theme][value.slice(4, -1).trim()];
  if (!value?.startsWith('#')) throw new Error(`${name} (${theme}) does not resolve to a hex`);
  return value;
}

/** The custom property the `prefix`bg class paints: `bg-muted` → --role-muted, `bg-[var(--x)]` → --x. */
function bgVar(className: string, prefix = ''): string {
  const p = prefix.replace(/[:]/g, '\\:');
  const arbitrary = className.match(new RegExp(`(?:^|\\s)${p}bg-\\[var\\((--[\\w-]+)\\)\\]`));
  if (arbitrary) return arbitrary[1];
  const role = className.match(new RegExp(`(?:^|\\s)${p}bg-([a-z-]+)(?:\\s|$)`));
  if (role) return `--role-${role[1]}`;
  throw new Error(`no ${prefix}bg in "${className}"`);
}

const OPTIONS: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
];

const VARIANTS = {
  multiple: () => (
    <Combobox
      multiple
      aria-label="Countries"
      options={OPTIONS}
      value={['us']}
      onChange={() => {}}
    />
  ),
  creatable: () => (
    <Combobox
      multiple
      creatable
      aria-label="Countries"
      options={OPTIONS}
      value={['us']}
      onChange={() => {}}
      onCreate={() => {}}
    />
  ),
};

describe('Combobox chip hover changes the fill (hds#522)', () => {
  for (const [name, renderIt] of Object.entries(VARIANTS)) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${name}: the hover fill differs from the rest fill (${theme})`, () => {
        render(renderIt());
        const chip = screen.getByRole('button', { name: 'Remove United States' });
        const rest = color(bgVar(chip.className), theme);
        const hover = color(bgVar(chip.className, 'hover:'), theme);
        expect(contrastRatio(rest, hover)).toBeGreaterThanOrEqual(1.1);
      });
    }
  }
});
