/**
 * Contract test: Select
 * The open listbox has an accessible name (hds#398). Radix Select Content
 * renders role="listbox" with no name of its own, so Select supplies one: the
 * visible field label by reference, the label text when the label is hidden.
 *
 * What a screen reader speaks for the same markup is pinned in
 * screen-reader.contract.test.tsx.
 *
 * @primitive Select
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Select, type SelectProps } from '@/app/components/select';
import { user, FRUIT } from './overlay-fixtures';

afterEach(cleanup);

function renderSelect(props: Partial<SelectProps> = {}) {
  render(<Select label="Fruit" options={FRUIT} value="apple" onChange={() => {}} {...props} />);
}

/** Open the listbox from the keyboard, as a keyboard user would. */
async function open() {
  screen.getByRole('combobox').focus();
  await user().keyboard('{Enter}');
}

describe('Select contract', () => {
  it('names the open listbox by the visible field label', async () => {
    renderSelect();
    await open();

    const listbox = await screen.findByRole('listbox', { name: 'Fruit' });
    // By reference, not a copy of the text: the name follows the label element.
    expect(listbox.getAttribute('aria-labelledby')).toBe(screen.getByText('Fruit').id);
  });

  it('names the open listbox by the label text when the label is hidden', async () => {
    renderSelect({ showLabel: false });
    await open();

    expect(await screen.findByRole('listbox', { name: 'Fruit' })).toBeTruthy();
  });

  it('names the open listbox like the trigger when there is no label text', async () => {
    renderSelect({ label: '' });
    await open();

    expect(await screen.findByRole('listbox', { name: 'Apple' })).toBeTruthy();
  });
});
