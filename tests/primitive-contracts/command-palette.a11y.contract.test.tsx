/**
 * Contract test: CommandPalette accessibility rules (hds#638). The palette owns
 * operable behaviour on top of Dialog: a search field that is the combobox, a
 * grouped listbox driven by aria-activedescendant, and a global hotkey. Each `it`
 * title carries the `a11y:<id>` the CommandPalette `@a11y component` tags point
 * at. Keyboard cases drive a real keyboard (user-event).
 *
 * @primitive CommandPalette
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import * as React from 'react';
import { CommandPalette, type CommandPaletteItem } from '@/app/components/command-palette';
import { axeViolations } from '../helpers/axe';
import { user, MULTI_STEP_COMMANDS as MULTI } from './overlay-fixtures';

afterEach(cleanup);

const ITEMS: CommandPaletteItem[] = [
  { id: 'new', label: 'New issue', group: 'Actions', shortcut: ['C'] },
  { id: 'off', label: 'Archive project', group: 'Actions', disabled: true },
  { id: 'inbox', label: 'Go to inbox', group: 'Navigation', shortcut: ['G', 'I'] },
];

function Page() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Search
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={ITEMS} onSelect={() => {}} />
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'Command palette' });

/** The open palette with the multi-step command, focus in its search field. */
function renderMulti() {
  const u = user();
  render(<CommandPalette open items={MULTI} onOpenChange={() => {}} onSelect={() => {}} />);
  const input = field();
  input.focus();
  return { u, input };
}

describe('CommandPalette accessibility contract', () => {
  it('a11y:command-palette.dialog-named - the palette is a modal dialog named by its label', async () => {
    render(
      <CommandPalette
        open
        label="Jump to"
        items={ITEMS}
        onOpenChange={() => {}}
        onSelect={() => {}}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Jump to' });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Jump to' })).toBeTruthy();
  });

  it('a11y:command-palette.hotkey-focus - Ctrl+K opens the palette with focus in the search field', async () => {
    const u = user();
    render(<Page />);
    await u.keyboard('{Control>}k{/Control}');
    await waitFor(() => expect(document.activeElement).toBe(field()));
  });

  it('a11y:command-palette.combobox-state - the search field is a combobox that controls the listbox and reports the active option', () => {
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const input = field();
    const listbox = screen.getByRole('listbox', { name: 'Command palette' });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId && document.getElementById(activeId)?.getAttribute('role')).toBe('option');
  });

  it('a11y:command-palette.groups-named - each group is a group named by its heading', () => {
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByRole('group', { name: 'Actions' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Navigation' })).toBeTruthy();
  });

  it('a11y:command-palette.options-not-tabbable - options stay out of the tab order and Tab stays in the dialog', async () => {
    const u = user();
    render(<Page />);
    await u.keyboard('{Control>}k{/Control}');
    await waitFor(() => expect(document.activeElement).toBe(field()));
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
    await u.tab();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('a11y:command-palette.arrow-keys - ArrowDown and ArrowUp move the active option, skip disabled ones and wrap', async () => {
    const u = user();
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const input = field();
    input.focus();
    const activeLabel = () =>
      document.getElementById(input.getAttribute('aria-activedescendant') ?? '')?.textContent;
    expect(activeLabel()).toContain('New issue');
    await u.keyboard('{ArrowDown}');
    expect(activeLabel()).toContain('Go to inbox');
    await u.keyboard('{ArrowDown}');
    expect(activeLabel()).toContain('New issue');
    await u.keyboard('{ArrowUp}');
    expect(activeLabel()).toContain('Go to inbox');
  });

  it('a11y:command-palette.option-state - options report selection for the active row and disabled state', () => {
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const [first, off] = screen.getAllByRole('option');
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(off.getAttribute('aria-disabled')).toBe('true');
  });

  it('a11y:command-palette.shortcut-described - an option is named by its label and described by its shortcut', () => {
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const inbox = screen.getByRole('option', { name: 'Go to inbox' });
    const describedBy = inbox.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('G I');
  });

  it('a11y:command-palette.result-count-announced - the match count is announced in a polite status as the list filters', async () => {
    const u = user();
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('3 results');
    field().focus();
    await u.keyboard('inbox');
    expect(status.textContent).toBe('1 result');
  });

  it('a11y:command-palette.escape-returns-focus - Escape closes the palette and returns focus to where it was', async () => {
    const u = user();
    render(<Page />);
    const opener = screen.getByRole('button', { name: 'Search' });
    await u.click(opener);
    await waitFor(() => expect(document.activeElement).toBe(field()));
    await u.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('a11y:command-palette.argument-chips - a multi-step command shows the command and each chosen argument as a removable Tag chip before the field', async () => {
    const { u, input } = renderMulti();
    await u.keyboard('{Enter}');
    // Picking the command did not close the palette; it became a chip and the
    // first argument's options replaced the command list.
    expect(screen.getByRole('dialog')).toBeTruthy();
    const chip = screen.getByRole('button', { name: 'Remove Move issue' });
    expect(chip).toBeTruthy();
    expect(input.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    await u.keyboard('{ArrowDown}');
    await u.keyboard('{Enter}');
    // Enter on the first option picked it (arrow moved past it to API platform).
    expect(screen.getByRole('button', { name: 'Remove API platform' })).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it('a11y:command-palette.chip-backspace - Backspace in an empty field removes the last chip and steps back, focus staying in the field', async () => {
    const { u, input } = renderMulti();
    await u.keyboard('{Enter}');
    await u.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Remove Website' })).toBeTruthy();
    await u.keyboard('{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove Website' })).toBeNull();
    expect(document.activeElement).toBe(input);
    // The argument step is current again: its options are the listbox rows.
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Website',
      'API platform',
    ]);
    await u.keyboard('{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove Move issue' })).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('a11y:command-palette.argument-step-announced - each argument step is announced in the polite status with its name and position', async () => {
    const { u } = renderMulti();
    await u.keyboard('{Enter}');
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Project');
    expect(status.textContent).toContain('1 of 2');
    await u.keyboard('{Enter}');
    expect(status.textContent).toContain('Note');
    expect(status.textContent).toContain('2 of 2');
  });

  it('a11y:command-palette.axe-clean - the open palette has no axe violations, filtered or empty', async () => {
    const u = user();
    render(<CommandPalette open items={ITEMS} onOpenChange={() => {}} onSelect={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(await axeViolations(dialog)).toEqual([]);
    field().focus();
    await u.keyboard('zzz');
    expect(await axeViolations(dialog)).toEqual([]);
  });
});
