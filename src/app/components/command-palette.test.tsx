/**
 * Tests for CommandPalette — filtering, grouping, arrow-key navigation, Enter to
 * run, the ⌘K / Ctrl+K hotkey, and the empty state. Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import * as React from 'react';
import { CommandPalette, type CommandPaletteItem } from './command-palette';

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ITEMS: CommandPaletteItem[] = [
  { id: 'new-issue', label: 'New issue', group: 'Actions', shortcut: ['C'] },
  { id: 'archive', label: 'Archive project', group: 'Actions', disabled: true },
  { id: 'settings', label: 'Open settings', group: 'Navigation', keywords: ['preferences'] },
  { id: 'inbox', label: 'Go to inbox', group: 'Navigation', shortcut: ['G', 'I'] },
];

function Harness(props: { onSelect?: (item: CommandPaletteItem) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? true);
  return (
    <>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={ITEMS}
        onSelect={props.onSelect ?? (() => {})}
      />
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'Command palette' }) as HTMLInputElement;
const active = () => {
  const id = field().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};
const optionNames = () =>
  screen
    .getAllByRole('option')
    .map((o) => document.getElementById(o.getAttribute('aria-labelledby') ?? '')?.textContent);

describe('CommandPalette', () => {
  it('renders nothing while closed', () => {
    render(<Harness defaultOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('groups items under their group headings, in first-seen order', () => {
    render(<Harness />);
    const groups = screen.getAllByRole('group');
    expect(within(groups[0]).getByText('Actions')).toBeTruthy();
    expect(within(groups[1]).getByText('Navigation')).toBeTruthy();
    expect(within(groups[1]).getAllByRole('option')).toHaveLength(2);
  });

  it('filters by label and keywords, dropping empty groups', () => {
    render(<Harness />);
    fireEvent.change(field(), { target: { value: 'prefer' } });
    expect(optionNames()).toEqual(['Open settings']);
    expect(screen.getAllByRole('group')).toHaveLength(1);
  });

  it('shows the empty message outside the listbox when nothing matches', () => {
    render(<Harness />);
    fireEvent.change(field(), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    const empty = screen.getByText('No results');
    expect(screen.getByRole('listbox').contains(empty)).toBe(false);
  });

  it('starts on the first enabled item and moves with the arrows, skipping disabled and wrapping', () => {
    render(<Harness />);
    expect(active()?.textContent).toContain('New issue');
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(active()?.textContent).toContain('Open settings');
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(active()?.textContent).toContain('New issue');
    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    expect(active()?.textContent).toContain('Go to inbox');
  });

  it('Enter runs the active item and closes the palette', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(ITEMS[2]);
    expect(screen.getByTestId('state').textContent).toBe('closed');
  });

  it('a click runs an item; a disabled item does nothing', () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /Archive project/ }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('option', { name: /Go to inbox/ }));
    expect(onSelect).toHaveBeenCalledWith(ITEMS[3]);
  });

  it('shows each shortcut as Kbd keys', () => {
    render(<Harness />);
    const inbox = screen.getByRole('option', { name: /Go to inbox/ });
    expect(Array.from(inbox.querySelectorAll('kbd')).map((k) => k.textContent)).toEqual(['G', 'I']);
  });

  it('⌘K and Ctrl+K toggle the palette from anywhere on the page', () => {
    render(<Harness defaultOpen={false} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByTestId('state').textContent).toBe('open');
    fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
    expect(screen.getByTestId('state').textContent).toBe('closed');
  });

  it('ignores a held ⌘K and one the page already handled', () => {
    render(<Harness defaultOpen={false} />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true, repeat: true });
    expect(screen.getByTestId('state').textContent).toBe('closed');
    document.body.addEventListener('keydown', (e) => e.preventDefault(), { once: true });
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(screen.getByTestId('state').textContent).toBe('closed');
  });

  it('hotkey={false} leaves ⌘K alone', () => {
    const onOpenChange = vi.fn();
    render(
      <CommandPalette
        open={false}
        onOpenChange={onOpenChange}
        items={ITEMS}
        onSelect={() => {}}
        hotkey={false}
      />,
    );
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('clears the query when it reopens', () => {
    const { rerender } = render(
      <CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />,
    );
    fireEvent.change(field(), { target: { value: 'inbox' } });
    rerender(
      <CommandPalette open={false} items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />,
    );
    rerender(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    expect(field().value).toBe('');
  });
});
