/**
 * Contract test: the accessibility rules of the overlay, listbox, table and
 * feedback components that the keyboard and screen-reader suites do not reach
 * (hds#520). Every `a11y:<id>` in a title is the test id an `@a11y` rule in the
 * component's JSDoc points at; scripts/check-a11y-contracts.mjs fails when a
 * component-owned rule has no active test carrying its id.
 *
 * Covers: AlertDialog initial focus and no outside dismiss, Popover role and
 * trigger wiring, Menu Space activation, Tooltip hoverable and persistent
 * (WCAG 1.4.13), Toast live region / F8 / Dismiss / pause (4.1.3, 2.2.1), Table
 * keyboard sort, Combobox result-count announcement, DestructiveSection focus
 * return.
 *
 * @primitive AlertDialog Popover Menu Tooltip ToastProvider Table Combobox DestructiveSection
 */
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import { AlertDialog } from '@/app/components/alert-dialog';
import { Popover } from '@/app/components/popover';
import { Menu } from '@/app/components/menu';
import { Tooltip } from '@/app/components/hds-tooltip';
import { ToastProvider, useToast } from '@/app/components/toast';
import { Table, type TableColumn, type TableRow } from '@/app/components/table';
import { Combobox } from '@/app/components/combobox';
import { DestructiveSection } from '@/app/components/destructive-section';
import { user, FRUIT } from './overlay-fixtures';

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

// ── AlertDialog ───────────────────────────────────────────────────────────────

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

describe('AlertDialog accessibility contract', () => {
  it('a11y:alertdialog.initial-focus-cancel - focus lands on Cancel, the least destructive action', async () => {
    const u = user();
    render(<AlertDialogFixture />);
    screen.getByRole('button', { name: 'Delete' }).focus();
    await u.keyboard('{Enter}');
    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it('a11y:alertdialog.no-outside-dismiss - a click outside does not close it', async () => {
    const u = user();
    render(<AlertDialogFixture />);
    screen.getByRole('button', { name: 'Delete' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    await u.pointer({ keys: '[MouseLeft]', target: document.body });
    fireEvent.pointerDown(document.body);
    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);
    expect(screen.queryByRole('alertdialog')).not.toBeNull();
  });

  it('a11y:alertdialog.named-and-described - role=alertdialog named by the title, described by the description', async () => {
    const u = user();
    render(<AlertDialogFixture />);
    screen.getByRole('button', { name: 'Delete' }).focus();
    await u.keyboard('{Enter}');
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete project?' });
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      'This cannot be undone.',
    );
  });

  it('a11y:alertdialog.actions-named - Cancel and Action are named buttons', async () => {
    const u = user();
    render(<AlertDialogFixture />);
    screen.getByRole('button', { name: 'Delete' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeNull();
  });
});

// ── Popover ───────────────────────────────────────────────────────────────────

describe('Popover accessibility contract', () => {
  function PopoverFixture() {
    return (
      <Popover>
        <Popover.Trigger>Open popover</Popover.Trigger>
        <Popover.Content aria-label="Filters">
          <button type="button">Inside</button>
        </Popover.Content>
      </Popover>
    );
  }

  it('a11y:popover.trigger-haspopup - the trigger announces a dialog popup', () => {
    render(<PopoverFixture />);
    expect(screen.getByRole('button', { name: 'Open popover' }).getAttribute('aria-haspopup')).toBe(
      'dialog',
    );
  });

  it('a11y:popover.content-role-dialog - the open content is a dialog that takes the name the consumer gives it', async () => {
    const u = user();
    render(<PopoverFixture />);
    screen.getByRole('button', { name: 'Open popover' }).focus();
    await u.keyboard('{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Filters' })).not.toBeNull();
  });

  it('a11y:popover.non-modal - the page behind stays reachable while it is open', async () => {
    const u = user();
    render(<PopoverFixture />);
    const trigger = screen.getByRole('button', { name: 'Open popover' });
    trigger.focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('dialog');
    expect(trigger.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.body.style.pointerEvents).not.toBe('none');
  });
});

// ── Menu ──────────────────────────────────────────────────────────────────────

describe('Menu accessibility contract', () => {
  it('a11y:menu.space-activates - Space on the highlighted item selects it and closes the menu', async () => {
    const onSelect = vi.fn();
    const u = user();
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item onSelect={onSelect}>Apple</Menu.Item>
          <Menu.Item>Banana</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    screen.getByRole('button', { name: 'Actions' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('menu');
    await u.keyboard(' ');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('a11y:menu.trigger-haspopup - the trigger announces a menu popup', () => {
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Apple</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    expect(screen.getByRole('button', { name: 'Actions' }).getAttribute('aria-haspopup')).toBe(
      'menu',
    );
  });

  it('a11y:menu.disabled-skipped - a disabled item is aria-disabled and arrow keys step over it', async () => {
    const u = user();
    render(
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Apple</Menu.Item>
          <Menu.Item disabled>Banana</Menu.Item>
          <Menu.Item>Cherry</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    screen.getByRole('button', { name: 'Actions' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('menu');
    const banana = screen.getByRole('menuitem', { name: 'Banana' });
    expect(banana.getAttribute('aria-disabled')).toBe('true');
    await u.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Cherry' }));
  });
});

// ── Tooltip ───────────────────────────────────────────────────────────────────

describe('Tooltip accessibility contract (WCAG 1.4.13)', () => {
  function Fixture() {
    return (
      <Tooltip delayDuration={0}>
        <Tooltip.Trigger>Copy</Tooltip.Trigger>
        <Tooltip.Content>Copy link</Tooltip.Content>
      </Tooltip>
    );
  }

  it('a11y:tooltip.persistent - it stays open until focus leaves, Escape is pressed or the pointer leaves, with no timer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const u = userEventWithTimers();
    render(<Fixture />);
    await u.tab();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.queryByRole('tooltip')).not.toBeNull();
  });

  it('a11y:tooltip.hoverable - the pointer can move from the trigger onto the bubble without it closing', async () => {
    const u = user();
    render(<Fixture />);
    const trigger = screen.getByRole('button', { name: 'Copy' });
    await u.hover(trigger);
    // Radix renders the bubble twice (visible + visually hidden a11y copy).
    const bubble = (await screen.findAllByText('Copy link'))[0].closest(
      '[data-radix-popper-content-wrapper]',
    ) as HTMLElement;
    expect(bubble).not.toBeNull();
    await u.unhover(trigger);
    await u.hover(bubble);
    await new Promise((r) => setTimeout(r, 120));
    expect(screen.queryByRole('tooltip')).not.toBeNull();
  });

  it('a11y:tooltip.no-interactive-content - the bubble is not in the tab order', async () => {
    const u = user();
    render(
      <>
        <Fixture />
        <button type="button">After</button>
      </>,
    );
    await u.tab();
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeNull());
    const bubble = screen.getByRole('tooltip').closest('[data-radix-popper-content-wrapper]');
    expect(
      bubble?.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])'),
    ).toHaveLength(0);
  });
});

import userEvent from '@testing-library/user-event';
function userEventWithTimers() {
  return userEvent.setup({ pointerEventsCheck: 0, advanceTimers: vi.advanceTimersByTime });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastFixture({ duration = 5000 }: { duration?: number }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => toast({ title: 'Saved', description: 'All good', tone: 'success', duration })}
    >
      fire
    </button>
  );
}

/** Radix listens on the document for the F8 hotkey by event.code. */
const pressF8 = () => fireEvent.keyDown(document, { key: 'F8', code: 'F8' });

function renderToast(duration?: number) {
  return render(
    <ToastProvider>
      <ToastFixture duration={duration} />
    </ToastProvider>,
  );
}

describe('Toast accessibility contract', () => {
  it('a11y:toast.live-region - title and description are announced through a live region (4.1.3)', async () => {
    renderToast();
    fireEvent.click(screen.getByText('fire'));
    // Radix announces through a visually hidden role=status node it appends to the
    // viewport a frame after the toast mounts.
    const region = await screen.findByRole('status');
    expect(['polite', 'assertive']).toContain(region.getAttribute('aria-live'));
    await waitFor(() => expect(region.textContent).toContain('Saved'));
    expect(region.textContent).toContain('All good');
  });

  it('a11y:toast.viewport-named - the viewport is a region with an accessible name', () => {
    renderToast();
    const region = screen.getByRole('region', { name: /Notifications/ });
    expect(region).not.toBeNull();
  });

  it('a11y:toast.f8-focuses-viewport - F8 moves focus to the notifications viewport', async () => {
    renderToast();
    fireEvent.click(screen.getByText('fire'));
    await screen.findAllByText('Saved');
    pressF8();
    const viewport = screen.getByRole('region', { name: /Notifications/ }).querySelector('ol');
    await waitFor(() => expect(document.activeElement).toBe(viewport));
  });

  it('a11y:toast.dismiss-keyboard - Dismiss is a named button reachable by Tab and closes the toast with Enter', async () => {
    const u = user();
    renderToast();
    fireEvent.click(screen.getByText('fire'));
    await screen.findAllByText('Saved');
    pressF8();
    for (
      let i = 0;
      i < 6 && document.activeElement?.getAttribute('aria-label') !== 'Dismiss';
      i++
    ) {
      await u.tab();
    }
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Dismiss');
    await u.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
  });

  it('a11y:toast.tone-icon-decorative - the tone icon is hidden from assistive technology; the title carries the meaning', async () => {
    renderToast();
    fireEvent.click(screen.getByText('fire'));
    const title = (await screen.findAllByText('Saved')).find((el) =>
      el.closest('li'),
    ) as HTMLElement;
    const icon = title.closest('li')?.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a11y:toast.dismiss-target-size - the Dismiss button is at least 24px (2.5.8)', async () => {
    renderToast();
    fireEvent.click(screen.getByText('fire'));
    await screen.findAllByText('Saved');
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    expect(dismiss.className).toMatch(/\bsize-(6|7|8|9|10)\b/);
  });

  it('a11y:toast.pause-on-hover-focus - the timer pauses while the pointer or focus is on the viewport (2.2.1)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    renderToast(1000);
    fireEvent.click(screen.getByText('fire'));
    // Radix listens on the region wrapper, not the list.
    const viewport = screen.getByRole('region', { name: /Notifications/ });
    await act(async () => {});
    expect(screen.queryAllByText('Saved').length).toBeGreaterThan(0);
    // Pointer over the viewport pauses; 10s later the toast is still there.
    fireEvent.pointerMove(viewport);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.queryAllByText('Saved').length).toBeGreaterThan(0);
    // Leaving resumes; the timer then runs out.
    fireEvent.pointerLeave(viewport);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.queryAllByText('Saved')).toHaveLength(0);
  });
});

// ── Table ─────────────────────────────────────────────────────────────────────

describe('Table accessibility contract', () => {
  const columns = (onSort: () => void): TableColumn[] => [
    { key: 'name', label: 'Name', sortable: true, sortDirection: 'none', onSort },
    { key: 'value', label: 'Value' },
  ];
  const rows: TableRow[] = [
    {
      key: 'a',
      cells: [
        { slot: 'label', content: 'Alpha' },
        { slot: 'value', content: '1' },
      ],
    },
  ];

  it.each([['{Enter}'], [' ']])(
    'a11y:table.sort-keyboard - the sort button activates with %j',
    async (key) => {
      const onSort = vi.fn();
      const u = user();
      render(<Table columns={columns(onSort)} rows={rows} />);
      screen.getByRole('button', { name: 'Name' }).focus();
      await u.keyboard(key);
      expect(onSort).toHaveBeenCalledTimes(1);
    },
  );

  it('a11y:table.scroll-region-focusable - the scroll region is a named tab stop, so keyboard users can scroll it (1.4.10)', () => {
    render(<Table columns={columns(() => {})} rows={rows} />);
    const region = screen.getByRole('region', { name: 'Scrollable table content' });
    expect(region.tabIndex).toBe(0);
  });

  it('a11y:table.table-role - the grid is exposed as a table with column headers', () => {
    render(<Table columns={columns(() => {})} rows={rows} />);
    expect(screen.getByRole('table')).not.toBeNull();
    expect(screen.getAllByRole('columnheader').length).toBe(2);
  });
});

// ── Combobox result count ─────────────────────────────────────────────────────

describe('Combobox live announcement (WCAG 4.1.3)', () => {
  function Fixture() {
    const [value, setValue] = useState<string | null>(null);
    return <Combobox aria-label="Fruit" options={FRUIT} value={value} onChange={setValue} />;
  }

  it('a11y:combobox.result-count-announced - the number of matches is announced in a polite status as the list is filtered', async () => {
    const u = user();
    render(<Fixture />);
    screen.getByRole('combobox', { name: 'Fruit' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('listbox');
    const status = await screen.findByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    await waitFor(() => expect(status.textContent).toMatch(/3 results/));
    await u.keyboard('ban');
    await waitFor(() => expect(status.textContent).toMatch(/1 result\b/));
    await u.keyboard('zzz');
    await waitFor(() => expect(status.textContent).toMatch(/No results|0 results/));
  });
});

// ── DestructiveSection ────────────────────────────────────────────────────────

describe('DestructiveSection accessibility contract', () => {
  function setup(onConfirm = vi.fn()) {
    render(
      <DestructiveSection
        title="Archive client"
        description="Hides the client from every list."
        actionLabel="Archive client"
        confirmLabel="Yes, archive"
        confirmBody="Archived clients stop receiving updates."
        onConfirm={onConfirm}
      />,
    );
    return onConfirm;
  }

  it('a11y:destructive-section.cancel-returns-focus - Cancel closes the dialog, returns focus to the trigger and never runs the action', async () => {
    const u = user();
    const onConfirm = setup();
    const trigger = screen.getByRole('button', { name: 'Archive client' });
    trigger.focus();
    await u.keyboard('{Enter}');
    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    await u.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('a11y:destructive-section.first-press-safe - the first press opens a confirmation and does not run the action', async () => {
    const u = user();
    const onConfirm = setup();
    screen.getByRole('button', { name: 'Archive client' }).focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('a11y:destructive-section.confirm-returns-focus - confirming runs the action once and returns focus to the trigger', async () => {
    const u = user();
    const onConfirm = setup();
    const trigger = screen.getByRole('button', { name: 'Archive client' });
    trigger.focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    await u.click(screen.getByRole('button', { name: 'Yes, archive' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
