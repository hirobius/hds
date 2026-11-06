/**
 * Hover fills that must show (hds#522, "shadcn tokens next to --semantic-*").
 *
 * `bg-accent` (surface.accentSubtle) is all but equal to `bg-muted` and to the
 * white popover in light, so a control that hovered to it showed no hover: the
 * Combobox chips (1.01:1 on their muted rest) and the Dialog and Sheet close
 * buttons (1.10:1 on the popover). The hover fill must differ from what is under
 * it by 1.15:1 or more in light and dark. The colours come from the rendered
 * classes resolved against the shipped token sheet, as in
 * segmented-control.contrast.test.tsx, through the shared resolver
 * (tests/helpers/token-sheet.ts, hds#961).
 */
import type { ReactElement } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { contrastRatio } from '../utils/colorUtils';
import { color, paintedVar } from '../../../tests/helpers/token-sheet';
import { Combobox, type ComboboxOption } from './combobox';
import { Dialog } from './dialog';
import { Sheet } from './sheet';
import { Avatar } from './avatar';
import { AvatarGroup } from './avatar-group';
import { Kbd } from './kbd';
import { Callout } from './callout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

afterEach(cleanup);

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

/** A fill class, plain or behind a variant: `bg-muted`, `data-[state=active]:bg-[var(--x)]`. */
const FILL =
  /(?:^|\s)(?:[\w-]+(?:\[[^\]]+\])?:)?bg-(?:\[var\((--[\w-]+)\)\]|(muted|accent(?:\/\d+)?))(?:\s|$)/;

function fillVar(className: string): string {
  const m = className.match(FILL);
  if (!m) throw new Error(`no fill in "${className}"`);
  if (m[2]?.includes('/'))
    throw new Error(`"${m[2]}" is a tint at opacity: no solid fill to measure`);
  return m[1] ?? `--role-${m[2]}`;
}

interface RestCase {
  render: () => ReactElement;
  find: (container: HTMLElement) => HTMLElement;
  /** The surfaces the element is drawn on. */
  on: string[];
}

// Rest fills (hds#522, the rest of the shadcn-token audit): `bg-muted` is 1.04:1
// on a raised Card in light, and the Tabs `bg-accent/5` tint is near-invisible.
const REST_CASES: Record<string, RestCase> = {
  Avatar: {
    render: () => <Avatar name="Ada Lovelace" />,
    find: (c) => c.firstElementChild as HTMLElement,
    on: ['--role-background', '--role-card'],
  },
  'AvatarGroup overflow': {
    render: () => (
      <AvatarGroup max={1}>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
      </AvatarGroup>
    ),
    find: () => screen.getByText('+1').parentElement as HTMLElement,
    on: ['--role-background', '--role-card'],
  },
  'Callout accent': {
    render: () => <Callout tone="accent">Note</Callout>,
    find: () => screen.getByText('Note').closest('div') as HTMLElement,
    on: ['--role-background', '--role-card'],
  },
  Kbd: {
    render: () => <Kbd>K</Kbd>,
    find: (c) => c.querySelector('kbd') as HTMLElement,
    on: ['--role-background', '--role-card'],
  },
  'Tabs active trigger': {
    render: () => <TabsCase />,
    find: () => screen.getByRole('tab', { selected: true }),
    on: ['--role-background', '--role-card'],
  },
  'Tabs panel': {
    render: () => <TabsCase />,
    find: () => screen.getByRole('tabpanel'),
    on: ['--role-background', '--role-card'],
  },
};

function TabsCase() {
  return (
    <Tabs defaultValue="a">
      <TabsList>
        <TabsTrigger value="a">A</TabsTrigger>
        <TabsTrigger value="b">B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel</TabsContent>
    </Tabs>
  );
}

describe('rest fills differ from the surface they sit on (hds#522)', () => {
  for (const [name, c] of Object.entries(REST_CASES)) {
    for (const theme of ['light', 'dark'] as const) {
      for (const under of c.on) {
        it(`${name} on ${under}: 1.15:1 or more (${theme})`, () => {
          const { container } = render(c.render());
          const fill = fillVar(c.find(container).className);
          expect(contrastRatio(color(under, theme), color(fill, theme))).toBeGreaterThanOrEqual(
            1.15,
          );
        });
      }
    }
  }

  // The initials and key legends sit on the new fill: they keep 4.5:1.
  for (const name of ['Avatar', 'AvatarGroup overflow', 'Kbd'])
    for (const theme of ['light', 'dark'] as const)
      it(`${name} text keeps 4.5:1 on its fill (${theme})`, () => {
        const { container } = render(REST_CASES[name].render());
        const fill = fillVar(REST_CASES[name].find(container).className);
        expect(
          contrastRatio(color('--role-muted-foreground', theme), color(fill, theme)),
        ).toBeGreaterThanOrEqual(4.5);
      });
});

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
