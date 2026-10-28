/**
 * Hover fills that must show (hds#522, "shadcn tokens next to --semantic-*").
 *
 * `bg-accent` (surface.accentSubtle) is all but equal to `bg-muted` and to the
 * white popover in light, so a control that hovered to it showed no hover: the
 * Combobox chips (1.01:1 on their muted rest) and the Dialog and Sheet close
 * buttons (1.10:1 on the popover). The hover fill must differ from what is under
 * it by 1.15:1 or more in light and dark. The colours come from the rendered
 * classes resolved against the shipped token sheet, as in
 * segmented-control.contrast.test.tsx (one shared resolver: hds#961).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReactElement } from 'react';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { contrastRatio } from '../utils/colorUtils';
import { Combobox, type ComboboxOption } from './combobox';
import { Dialog } from './dialog';
import { Sheet } from './sheet';

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

/** The custom property a class paints: `bg-muted` → --role-muted, `bg-[var(--x)]` → --x. */
function paintedVar(className: string, pattern: RegExp): string {
  const m = className.match(pattern);
  if (!m) throw new Error(`no ${pattern} in "${className}"`);
  return m[1].startsWith('--') ? m[1] : `--role-${m[1]}`;
}

const REST = /(?:^|\s)bg-(muted|\[var\(--[\w-]+\)\])(?:\s|$)/;
const HOVER = /(?:^|\s)hover:bg-(?:\[var\((--[\w-]+)\)\]|([a-z]+))(?:\s|$)/;

function hoverVar(className: string): string {
  const m = className.match(HOVER);
  if (!m) throw new Error(`no hover fill in "${className}"`);
  return m[1] ?? `--role-${m[2]}`;
}

const OPTIONS: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
];

interface Case {
  render: () => ReactElement;
  button: string;
  /** What is under the button at rest: its own fill (`own`) or a surface var. */
  under: 'own' | string;
}

const CASES: Record<string, Case> = {
  'Combobox chip': {
    render: () => (
      <Combobox
        multiple
        aria-label="Countries"
        options={OPTIONS}
        value={['us']}
        onChange={() => {}}
      />
    ),
    button: 'Remove United States',
    under: 'own',
  },
  'Combobox creatable chip': {
    render: () => (
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
    button: 'Remove United States',
    under: 'own',
  },
  'Dialog close': {
    render: () => (
      <Dialog open>
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Edit</Dialog.Title>
        </Dialog.Content>
      </Dialog>
    ),
    button: 'Close',
    under: '--role-popover',
  },
  'Sheet close': {
    render: () => (
      <Sheet open>
        <Sheet.Content aria-describedby={undefined}>
          <Sheet.Title>Sort</Sheet.Title>
        </Sheet.Content>
      </Sheet>
    ),
    button: 'Close',
    under: '--role-popover',
  },
};

describe('hover fills differ from what is under them (hds#522)', () => {
  for (const [name, c] of Object.entries(CASES)) {
    for (const theme of ['light', 'dark'] as const) {
      it(`${name}: 1.15:1 or more (${theme})`, () => {
        render(c.render());
        const button = screen.getByRole('button', { name: c.button });
        const under = c.under === 'own' ? paintedVar(button.className, REST) : c.under;
        const ratio = contrastRatio(color(under, theme), color(hoverVar(button.className), theme));
        expect(ratio).toBeGreaterThanOrEqual(1.15);
      });
    }
  }
});
