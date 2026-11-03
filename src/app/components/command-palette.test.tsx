/**
 * Tests for CommandPalette — filtering, grouping, arrow-key navigation, Enter to
 * run, the ⌘K / Ctrl+K hotkey, and the empty state. Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import * as React from 'react';
import { MULTI_STEP_COMMANDS as MULTI } from '../../../tests/primitive-contracts/overlay-fixtures';
import { CommandPalette, type CommandPaletteItem } from './command-palette';

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

function Harness(props: {
  onSelect?: (item: CommandPaletteItem, args?: Readonly<Record<string, string>>) => void;
  defaultOpen?: boolean;
  items?: CommandPaletteItem[];
}) {
  const [open, setOpen] = React.useState(props.defaultOpen ?? true);
  return (
    <>
      <span data-testid="state">{open ? 'open' : 'closed'}</span>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={props.items ?? ITEMS}
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

  it('a command with arguments steps instead of running, showing the command as a chip', () => {
    const onSelect = vi.fn();
    render(<Harness items={MULTI} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('state').textContent).toBe('open');
    // The command is a chip before the field, and the first argument's options are listed.
    expect(screen.getByRole('button', { name: 'Remove Move issue' })).toBeTruthy();
    expect(optionNames()).toEqual(['Website', 'API platform']);
    expect(field().placeholder).toBe('Pick Project…');
  });

  it('filters argument options by label and keywords', () => {
    render(<Harness items={MULTI} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.change(field(), { target: { value: 'backend' } });
    expect(optionNames()).toEqual(['API platform']);
  });

  it('completes a multi-step command end to end: pick an option, type free text, runs with all arguments', () => {
    const onSelect = vi.fn();
    render(<Harness items={MULTI} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.click(screen.getByRole('option', { name: /Website/ }));
    // The picked argument is a chip too, and the step moves to the free-text argument.
    expect(screen.getByRole('button', { name: 'Remove Website' })).toBeTruthy();
    expect(field().placeholder).toBe('Enter Note…');
    fireEvent.change(field(), { target: { value: 'For Friday' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(MULTI[0], { project: 'web', note: 'For Friday' });
    expect(screen.getByTestId('state').textContent).toBe('closed');
  });

  it('Enter on an empty free-text argument does not run the command', () => {
    const onSelect = vi.fn();
    render(<Harness items={MULTI} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.click(screen.getByRole('option', { name: /Website/ }));
    fireEvent.keyDown(field(), { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId('state').textContent).toBe('open');
  });

  it('Backspace on an empty field removes the last chip and steps back', () => {
    render(<Harness items={MULTI} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.click(screen.getByRole('option', { name: /Website/ }));
    fireEvent.keyDown(field(), { key: 'Backspace' });
    // The argument chip is gone and its options are listed again.
    expect(screen.queryByRole('button', { name: 'Remove Website' })).toBeNull();
    expect(optionNames()).toEqual(['Website', 'API platform']);
    fireEvent.keyDown(field(), { key: 'Backspace' });
    // The command chip is gone too: back to the top-level command list.
    expect(screen.queryByRole('button', { name: 'Remove Move issue' })).toBeNull();
    expect(optionNames()).toEqual(['Move issue', 'Go to inbox']);
  });

  it('Backspace with text in the field leaves the chips alone', () => {
    render(<Harness items={MULTI} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.change(field(), { target: { value: 'web' } });
    fireEvent.keyDown(field(), { key: 'Backspace' });
    expect(screen.getByRole('button', { name: 'Remove Move issue' })).toBeTruthy();
  });

  it('dismissing a chip steps back to that argument and returns focus to the field', () => {
    render(<Harness items={MULTI} />);
    fireEvent.click(screen.getByRole('option', { name: /Move issue/ }));
    fireEvent.click(screen.getByRole('option', { name: /Website/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Website' }));
    expect(screen.queryByRole('button', { name: 'Remove Website' })).toBeNull();
    expect(optionNames()).toEqual(['Website', 'API platform']);
    expect(document.activeElement).toBe(field());
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
