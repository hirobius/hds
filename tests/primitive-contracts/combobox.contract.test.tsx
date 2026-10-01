/**
 * Contract test: Combobox
 * The open popover has an accessible name (hds#399). It is Popover.Content,
 * role="dialog", which names nothing itself, so Combobox names it the way it
 * already names the listbox inside it: by the field label (the aria-label
 * prop), falling back to the placeholder.
 *
 * What a screen reader speaks for the same markup is pinned in
 * screen-reader.contract.test.tsx.
 *
 * @primitive Combobox
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Combobox, type ComboboxProps } from '@/app/components/combobox';
import { user, FRUIT } from './overlay-fixtures';

afterEach(cleanup);

function renderCombobox(props: Partial<ComboboxProps> = {}) {
  render(<Combobox options={FRUIT} value={null} onChange={() => {}} {...props} />);
}

/** Open the popover from the keyboard, as a keyboard user would. */
async function open() {
  screen.getByRole('combobox').focus();
  await user().keyboard('{Enter}');
}

describe('Combobox contract', () => {
  it('names the open popover dialog and its listbox by the field label', async () => {
    renderCombobox({ 'aria-label': 'Fruit' });
    await open();

    expect(await screen.findByRole('dialog', { name: 'Fruit' })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Fruit' })).toBeTruthy();
  });

  it('names the open popover dialog by the placeholder when there is no field label', async () => {
    renderCombobox({ placeholder: 'Pick a fruit' });
    await open();

    expect(await screen.findByRole('dialog', { name: 'Pick a fruit' })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Pick a fruit' })).toBeTruthy();
  });
});
