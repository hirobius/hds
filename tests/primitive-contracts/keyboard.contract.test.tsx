/**
 * Contract test: keyboard behaviour of the overlay and listbox primitives.
 *
 * Table-driven over Dialog, AlertDialog, Popover, Menu, Select, Tooltip,
 * Combobox and MultiSelector. Every case drives the component
 * with a real keyboard (user-event) rather than synthetic click events, so a
 * wrapper that breaks the underlying Radix contract fails here.
 *
 * Covered per component: open from the keyboard, Escape closes and returns focus
 * to the trigger, Tab (trapped when modal, moves on otherwise), Arrow keys and
 * typeahead in listboxes, and aria-expanded / aria-controls wiring.
 *
 * jsdom polyfills live in tests/setup/jsdom-polyfills.ts.
 *
 * @primitive Dialog AlertDialog Popover Menu Select Tooltip Combobox MultiSelector
 */
import { useState, type ReactElement } from 'react';
import { describe, it, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { AlertDialog } from '@/app/components/alert-dialog';
import { Popover } from '@/app/components/popover';
import { Tooltip } from '@/app/components/hds-tooltip';
import { MultiSelector } from '@/app/components/multi-selector';
import {
  user,
  FRUIT,
  DialogFixture,
  MenuFixture,
  SelectFixture,
  ComboboxFixture,
} from './overlay-fixtures';

afterEach(cleanup);

/** Combobox regression: hirobius/hds#311. */
const COMBOBOX_ISSUE = 'https://github.com/hirobius/hds/issues/311';

// ── Fixtures (Dialog, Menu, Select, Combobox live in ./overlay-fixtures) ──────

function AlertDialogFixture() {
  return (
    <AlertDialog>
      <AlertDialog.Trigger>Delete</AlertDialog.Trigger>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          <AlertDialog.Action>Confirm</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}

function PopoverFixture() {
  return (
    <>
      <Popover>
        <Popover.Trigger>Open popover</Popover.Trigger>
        <Popover.Content>
          <button type="button">Inside</button>
        </Popover.Content>
      </Popover>
      <button type="button">After</button>
    </>
  );
}

function MultiSelectorFixture() {
  const [value, setValue] = useState<string[]>([]);
  return <MultiSelector options={FRUIT} value={value} onChange={setValue} />;
}

// ── Table ───────────────────────────────────────────────────────────────────

interface Spec {
  name: string;
  ui: () => ReactElement;
  trigger: () => HTMLElement;
  /** The open surface (dialog, menu, listbox...) or null while closed. */
  surface: () => HTMLElement | null;
  /** Keys that open the surface from the focused trigger. */
  openKeys: string[];
  /** True when the trigger carries aria-expanded / aria-controls. */
  aria: boolean;
}

const q = (role: string) => screen.queryByRole(role);

const OVERLAYS: Spec[] = [
  {
    name: 'Dialog',
    ui: () => <DialogFixture />,
    trigger: () => screen.getByRole('button', { name: 'Open dialog' }),
    surface: () => q('dialog'),
    openKeys: ['{Enter}', ' '],
    aria: true,
  },
  {
    name: 'AlertDialog',
    ui: () => <AlertDialogFixture />,
    trigger: () => screen.getByRole('button', { name: 'Delete' }),
    surface: () => q('alertdialog'),
    openKeys: ['{Enter}', ' '],
    aria: true,
  },
  {
    name: 'Popover',
    ui: () => <PopoverFixture />,
    trigger: () => screen.getByRole('button', { name: 'Open popover' }),
    surface: () => q('dialog'),
    openKeys: ['{Enter}', ' '],
    aria: true,
  },
  {
    name: 'Menu',
    ui: () => <MenuFixture />,
    trigger: () => screen.getByRole('button', { name: 'Actions' }),
    surface: () => q('menu'),
    openKeys: ['{Enter}', ' ', '{ArrowDown}'],
    aria: true,
  },
  {
    name: 'Select',
    ui: () => <SelectFixture />,
    trigger: () => screen.getByRole('combobox'),
    surface: () => q('listbox'),
    openKeys: ['{Enter}', ' ', '{ArrowDown}'],
    aria: true,
  },
  {
    name: 'Combobox',
    ui: () => <ComboboxFixture />,
    trigger: () => screen.getByRole('combobox', { name: 'Fruit' }),
    surface: () => q('listbox'),
    openKeys: ['{Enter}', ' '],
    aria: true,
  },
  {
    name: 'MultiSelector',
    ui: () => <MultiSelectorFixture />,
    trigger: () => screen.getByRole('button', { name: /Select/ }),
    surface: () => q('dialog'),
    openKeys: ['{Enter}', ' '],
    aria: true,
  },
];

/** Open a spec's surface with the first open key and wait for it. */
async function openWithKeyboard(spec: Spec, key = spec.openKeys[0]) {
  const u = user();
  render(spec.ui());
  const trigger = spec.trigger();
  trigger.focus();
  expect(document.activeElement).toBe(trigger);
  await u.keyboard(key);
  await waitFor(() => expect(spec.surface()).not.toBeNull());
  return { u, trigger };
}

describe.each(OVERLAYS)('$name keyboard contract', (spec) => {
  it.each(spec.openKeys)('opens from the trigger with %j', async (key) => {
    await openWithKeyboard(spec, key);
    expect(spec.surface()).not.toBeNull();
  });

  it('stays closed until a key is pressed', () => {
    render(spec.ui());
    expect(spec.surface()).toBeNull();
  });

  // Combobox: the trigger is a Popover.Anchor, not a Popover.Trigger, so Radix
  // never learns which element to hand focus back to on close.
  const escapeReturnsFocus = async () => {
    const { u, trigger } = await openWithKeyboard(spec);
    await u.keyboard('{Escape}');
    await waitFor(() => expect(spec.surface()).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  };
  if (spec.name === 'Combobox') {
    // Known failure, tracked in hds#311 (see COMBOBOX_ISSUE).
    test.fails(
      `Escape closes and returns focus to the trigger (${COMBOBOX_ISSUE})`,
      escapeReturnsFocus,
    );
  } else {
    it('Escape closes and returns focus to the trigger', escapeReturnsFocus);
  }

  it('Escape closes the surface', async () => {
    const { u } = await openWithKeyboard(spec);
    await u.keyboard('{Escape}');
    await waitFor(() => expect(spec.surface()).toBeNull());
  });

  it('trigger aria-expanded flips false -> true on open', async () => {
    render(spec.ui());
    const trigger = spec.trigger();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.focus();
    await user().keyboard(spec.openKeys[0]);
    await waitFor(() => expect(spec.surface()).not.toBeNull());
    // Modal surfaces aria-hide the trigger, so assert on the captured element.
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('trigger aria-controls points at the open surface', async () => {
    const { trigger } = await openWithKeyboard(spec);
    const id = trigger.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    const target = document.getElementById(id as string);
    expect(target).not.toBeNull();
    expect(target?.contains(spec.surface())).toBe(true);
  });
});

// ── Tab behaviour ───────────────────────────────────────────────────────────

const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]')).filter(
    (el) => el.tabIndex >= 0,
  );

describe('Tab behaviour', () => {
  it.each([
    ['Dialog', OVERLAYS[0]],
    ['AlertDialog', OVERLAYS[1]],
  ] as const)('%s traps Tab inside the modal', async (_name, spec) => {
    const { u } = await openWithKeyboard(spec);
    const surface = spec.surface() as HTMLElement;
    const presses = focusables(surface).length + 2;
    for (let i = 0; i < presses; i++) {
      await u.tab();
      expect(surface.contains(document.activeElement)).toBe(true);
    }
    // Shift+Tab is trapped too.
    for (let i = 0; i < presses; i++) {
      await u.tab({ shift: true });
      expect(surface.contains(document.activeElement)).toBe(true);
    }
  });

  it('Dialog moves initial focus inside the surface on open', async () => {
    await openWithKeyboard(OVERLAYS[0]);
    expect((OVERLAYS[0].surface() as HTMLElement).contains(document.activeElement)).toBe(true);
  });

  // Note: the Tab loop is Radix's default FocusScope behaviour, not a design
  // decision; WAI-ARIA lets non-modal popovers release Tab. Recorded here so a
  // wrapper change is noticed, and flagged in the PR for a product call.
  // Radix Popover content runs a looping FocusScope: Tab cycles inside the open
  // content (it never walks the page behind it), but the popover is non-modal, so
  // the page stays reachable (no aria-hidden, no pointer-events lock).
  it.each([
    ['Popover', OVERLAYS[2]],
    ['MultiSelector', OVERLAYS[6]],
  ] as const)('%s loops Tab inside the content and leaves the page non-modal', async (_n, spec) => {
    const { u, trigger } = await openWithKeyboard(spec);
    const surface = spec.surface() as HTMLElement;
    expect(surface.contains(document.activeElement)).toBe(true);
    const presses = focusables(surface).length + 2;
    for (let i = 0; i < presses; i++) {
      await u.tab();
      expect(surface.contains(document.activeElement)).toBe(true);
    }
    expect(trigger.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
  });

  it('Menu keeps Tab from leaving to the page while open', async () => {
    const spec = OVERLAYS[3];
    const { u } = await openWithKeyboard(spec);
    const surface = spec.surface() as HTMLElement;
    await u.tab();
    // Radix Menu content preventDefaults Tab: the menu stays open, focus stays inside.
    expect(spec.surface()).not.toBeNull();
    expect(surface.contains(document.activeElement)).toBe(true);
  });

  it('Select keeps Tab from leaving to the page while open', async () => {
    const spec = OVERLAYS[4];
    const { u } = await openWithKeyboard(spec);
    const surface = spec.surface() as HTMLElement;
    await u.tab();
    // Radix Select content preventDefaults Tab: the listbox stays open, focus stays inside.
    expect(spec.surface()).not.toBeNull();
    expect(surface.contains(document.activeElement)).toBe(true);
  });

  it('Combobox: search field takes focus on open, Tab stays in the list, page stays non-modal', async () => {
    const spec = OVERLAYS[5];
    const { u, trigger } = await openWithKeyboard(spec);
    const input = screen.getByRole('combobox', { name: 'Search…' });
    await waitFor(() => expect(document.activeElement).toBe(input));
    const surface = input.closest('[data-radix-popper-content-wrapper]') as HTMLElement;
    for (let i = 0; i < 6; i++) {
      await u.tab();
      expect(surface.contains(document.activeElement)).toBe(true);
    }
    expect(trigger.closest('[aria-hidden="true"]')).toBeNull();
  });
});

// ── Arrow keys and typeahead ────────────────────────────────────────────────

const label = () => document.activeElement?.textContent?.trim();

describe('Menu arrow keys and typeahead', () => {
  it('opens with the first item highlighted, then ArrowDown/ArrowUp move and stop at the ends', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[3]);
    const items = screen.getAllByRole('menuitem');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    expect(items[0].hasAttribute('data-highlighted')).toBe(true);
    await u.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    expect(items[0].hasAttribute('data-highlighted')).toBe(false);
    await u.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(items[0]);
    // Radix menus do not loop by default: ArrowUp on the first item stays put.
    await u.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(items[0]);
  });

  it('Home and End jump to the first and last item', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[3]);
    const items = screen.getAllByRole('menuitem');
    await u.keyboard('{End}');
    expect(document.activeElement).toBe(items[2]);
    await u.keyboard('{Home}');
    expect(document.activeElement).toBe(items[0]);
  });

  it('typeahead focuses the item starting with the typed letter', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[3]);
    await u.keyboard('c');
    expect(label()).toBe('Cherry');
  });

  it('Enter on the highlighted item selects it and closes the menu', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[3]);
    await u.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(OVERLAYS[3].surface()).toBeNull());
  });
});

describe('Select arrow keys and typeahead', () => {
  it('opens with the selected option highlighted', async () => {
    await openWithKeyboard(OVERLAYS[4]);
    const selected = screen.getByRole('option', { name: 'Apple' });
    expect(selected.getAttribute('aria-selected')).toBe('true');
    await waitFor(() => expect(document.activeElement).toBe(selected));
  });

  it('ArrowDown/ArrowUp move the highlight', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[4]);
    const options = screen.getAllByRole('option');
    await waitFor(() => expect(document.activeElement).toBe(options[0]));
    await u.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(options[1]);
    expect(options[1].hasAttribute('data-highlighted')).toBe(true);
    await u.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(options[0]);
  });

  it('End and Home jump to the last and first option', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[4]);
    const options = screen.getAllByRole('option');
    await u.keyboard('{End}');
    expect(document.activeElement).toBe(options[2]);
    await u.keyboard('{Home}');
    expect(document.activeElement).toBe(options[0]);
  });

  it('typeahead highlights the matching option', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[4]);
    await u.keyboard('ch');
    expect(label()).toBe('Cherry');
  });

  it('Enter commits the highlighted option and returns focus to the trigger', async () => {
    const { u, trigger } = await openWithKeyboard(OVERLAYS[4]);
    await u.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(OVERLAYS[4].surface()).toBeNull());
    expect(trigger.textContent).toContain('Banana');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe('Combobox arrow keys', () => {
  const active = () =>
    screen.getByRole('combobox', { name: 'Search…' }).getAttribute('aria-activedescendant');
  const optionId = (name: string) => screen.getByRole('option', { name }).id;

  it('search field starts with the first option active', async () => {
    await openWithKeyboard(OVERLAYS[5]);
    expect(active()).toBe(optionId('Apple'));
  });

  it('ArrowDown/ArrowUp move aria-activedescendant and wrap', async () => {
    const { u } = await openWithKeyboard(OVERLAYS[5]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search…' })),
    );
    await u.keyboard('{ArrowDown}');
    expect(active()).toBe(optionId('Banana'));
    await u.keyboard('{ArrowUp}{ArrowUp}');
    expect(active()).toBe(optionId('Cherry'));
  });

  it('typing filters the list and Enter commits the active option', async () => {
    const { u, trigger } = await openWithKeyboard(OVERLAYS[5]);
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search…' })),
    );
    await u.keyboard('ban');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await u.keyboard('{Enter}');
    await waitFor(() => expect(OVERLAYS[5].surface()).toBeNull());
    expect(trigger.textContent).toContain('Banana');
  });
});

describe('MultiSelector keyboard selection', () => {
  it('Tab reaches the options and Space toggles a checkbox', async () => {
    const { u, trigger } = await openWithKeyboard(OVERLAYS[6]);
    const boxes = screen.getAllByRole('checkbox');
    await waitFor(() => expect(boxes).toContain(document.activeElement));
    await u.keyboard(' ');
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(1);
    expect(trigger.textContent).toContain('1 selected');
    // Selecting keeps the popover open for further picks.
    expect(OVERLAYS[6].surface()).not.toBeNull();
  });
});

// ── Tooltip ─────────────────────────────────────────────────────────────────
// Tooltip is the public Radix tooltip wrapper. Keyboard users open it by
// focusing the trigger; Escape dismisses it while focus stays on the trigger.

describe('Tooltip keyboard contract', () => {
  function TooltipFixture() {
    return (
      <>
        <Tooltip delayDuration={0}>
          <Tooltip.Trigger>Copy</Tooltip.Trigger>
          <Tooltip.Content>Copy link</Tooltip.Content>
        </Tooltip>
        <button type="button">After</button>
      </>
    );
  }

  async function focusTrigger() {
    const u = user();
    render(<TooltipFixture />);
    const trigger = screen.getByRole('button', { name: 'Copy' });
    expect(trigger.getAttribute('data-state')).toBe('closed');
    await u.tab();
    expect(document.activeElement).toBe(trigger);
    return { u, trigger };
  }

  it('is closed until the trigger is focused', () => {
    render(<TooltipFixture />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('opens when the trigger takes keyboard focus and exposes role=tooltip', async () => {
    const { trigger } = await focusTrigger();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    expect(screen.getByRole('tooltip').textContent).toContain('Copy link');
    expect(trigger.getAttribute('data-state')).not.toBe('closed');
  });

  it('wires aria-describedby from the trigger to the tooltip', async () => {
    const { trigger } = await focusTrigger();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    const id = trigger.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toContain('Copy link');
  });

  it('Escape closes it and focus stays on the trigger', async () => {
    const { u, trigger } = await focusTrigger();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('data-state')).toBe('closed');
  });

  it('Tab moves on to the next control and closes it', async () => {
    const { u } = await focusTrigger();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    await u.tab();
    expect(label()).toBe('After');
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });
});
