/**
 * Tests for Sheet (hds#690): the Dialog contract (keyboard open, focus trap,
 * Escape returns focus, named by its title), the action list (current, danger,
 * close on select) and the keyboard-aware visual viewport variables.
 */
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './sheet';

const SHEET_KEYBOARD_INSET_VAR = '--hds-local-sheet-inset-keyboard';
const SHEET_VISIBLE_HEIGHT_VAR = '--hds-local-sheet-height-visible';

const user = () => userEvent.setup({ pointerEventsCheck: 0 });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function SortSheet({ onPick = () => {} }: { onPick?: (v: string) => void }) {
  const [sort, setSort] = useState('newest');
  const pick = (v: string) => {
    setSort(v);
    onPick(v);
  };
  return (
    <Sheet>
      <Sheet.Trigger>Sort</Sheet.Trigger>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Sort by</Sheet.Title>
          <Sheet.Description>Order the list.</Sheet.Description>
        </Sheet.Header>
        <Sheet.Actions aria-label="Sort order">
          <Sheet.Action current={sort === 'newest'} onClick={() => pick('newest')}>
            Newest
          </Sheet.Action>
          <Sheet.Action current={sort === 'company'} onClick={() => pick('company')}>
            Company
          </Sheet.Action>
          <Sheet.Action tone="danger" closeOnSelect={false}>
            Clear
          </Sheet.Action>
        </Sheet.Actions>
      </Sheet.Content>
    </Sheet>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Sort' });

describe('Sheet', () => {
  it('renders nothing while closed', () => {
    render(<SortSheet />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each(['{Enter}', ' '])(
    'a11y:sheet.open-keys - opens from the trigger with %s and moves focus inside',
    async (key) => {
      const u = user();
      render(<SortSheet />);
      trigger().focus();
      await u.keyboard(key);
      const sheet = await screen.findByRole('dialog');
      expect(sheet.contains(document.activeElement)).toBe(true);
    },
  );

  it('a11y:sheet.named-by-title - is a dialog named by its title and described', async () => {
    const u = user();
    render(<SortSheet />);
    await u.click(trigger());
    const sheet = screen.getByRole('dialog', { name: 'Sort by' });
    const describedBy = sheet.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Order the list.');
  });

  it('a11y:sheet.escape-returns-focus - Escape closes and focus returns to the trigger', async () => {
    const u = user();
    render(<SortSheet />);
    trigger().focus();
    await u.keyboard('{Enter}');
    await screen.findByRole('dialog');
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger());
  });

  it('a11y:sheet.focus-trapped - Tab and Shift+Tab stay inside the open sheet', async () => {
    const u = user();
    render(
      <>
        <SortSheet />
        <button type="button">After</button>
      </>,
    );
    await u.click(trigger());
    const sheet = screen.getByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await u.tab();
      expect(sheet.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await u.tab({ shift: true });
      expect(sheet.contains(document.activeElement)).toBe(true);
    }
  });

  it('a11y:sheet.action-current - marks only the current action with aria-current', async () => {
    const u = user();
    render(<SortSheet />);
    await u.click(trigger());
    expect(screen.getByRole('button', { name: 'Newest' }).getAttribute('aria-current')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: 'Company' }).hasAttribute('aria-current')).toBe(
      false,
    );
    expect(screen.getByRole('list', { name: 'Sort order' })).not.toBeNull();
  });

  it('closes after an action by default and runs its handler', async () => {
    const u = user();
    const onPick = vi.fn();
    render(<SortSheet onPick={onPick} />);
    await u.click(trigger());
    await u.click(screen.getByRole('button', { name: 'Company' }));
    expect(onPick).toHaveBeenCalledWith('company');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('stays open after an action with closeOnSelect={false}', async () => {
    const u = user();
    render(<SortSheet />);
    await u.click(trigger());
    await u.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('dialog')).not.toBeNull();
  });

  it('sets a danger action in the danger colour', async () => {
    const u = user();
    render(<SortSheet />);
    await u.click(trigger());
    expect(screen.getByRole('button', { name: 'Clear' }).className).toContain(
      'text-feedback-danger',
    );
  });

  it('has a decorative grab handle and a named close button', async () => {
    const u = user();
    render(<SortSheet />);
    await u.click(trigger());
    const sheet = screen.getByRole('dialog');
    const handle = sheet.querySelector('.hds-sheet-handle');
    expect(handle?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull();
  });

  it('hides the close button with hideClose', () => {
    render(
      <Sheet open>
        <Sheet.Content hideClose aria-describedby={undefined}>
          <Sheet.Title>Status</Sheet.Title>
        </Sheet.Content>
      </Sheet>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('mirrors the visual viewport so the sheet sits above the keyboard', () => {
    const listeners: Record<string, () => void> = {};
    const vv = {
      height: 500,
      offsetTop: 0,
      addEventListener: (type: string, fn: () => void) => {
        listeners[type] = fn;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('visualViewport', vv);
    vi.stubGlobal('innerHeight', 800);
    const { unmount } = render(
      <Sheet open>
        <Sheet.Content aria-describedby={undefined}>
          <Sheet.Title>Edit details</Sheet.Title>
          <input aria-label="Title" />
        </Sheet.Content>
      </Sheet>,
    );
    const sheet = screen.getByRole('dialog');
    expect(sheet.style.getPropertyValue(SHEET_KEYBOARD_INSET_VAR)).toBe('300px');
    expect(sheet.style.getPropertyValue(SHEET_VISIBLE_HEIGHT_VAR)).toBe('500px');

    // The keyboard closes: the inset goes back to zero.
    vv.height = 800;
    listeners.resize();
    expect(sheet.style.getPropertyValue(SHEET_KEYBOARD_INSET_VAR)).toBe('0px');

    // Unmounting removes both listeners, the same functions that were added.
    unmount();
    expect(vv.removeEventListener).toHaveBeenCalledWith('resize', listeners.resize);
    expect(vv.removeEventListener).toHaveBeenCalledWith('scroll', listeners.scroll);
  });

  it('forwards a ref to the content and keeps a consumer className', () => {
    let node: HTMLDivElement | null = null;
    render(
      <Sheet open>
        <Sheet.Content
          ref={(el) => {
            node = el;
          }}
          className="sm:max-w-md"
          aria-describedby={undefined}
        >
          <Sheet.Title>Ref</Sheet.Title>
        </Sheet.Content>
      </Sheet>,
    );
    const sheet = screen.getByRole('dialog');
    expect(node).toBe(sheet);
    expect(sheet.className).toContain('hds-sheet');
    expect(sheet.className).toContain('sm:max-w-md');
  });
});
