/**
 * Contract test: Select
 * The open listbox has an accessible name (hds#398). Radix Select Content
 * renders role="listbox" with no name of its own, so Select supplies one: the
 * visible field label by reference, the label text when the label is hidden.
 *
 * The closed trigger is named by the field label and the value, also when the
 * label is hidden (hds#408). Inside a FormField, the field's <label for>
 * reaches the trigger: Select forwards `id`, `aria-describedby` and
 * `aria-invalid` to it (hds#408).
 *
 * What a screen reader speaks for the same markup is pinned in
 * screen-reader.contract.test.tsx.
 *
 * @primitive Select
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Select, type SelectProps } from '@/app/components/select';
import { FormField } from '@/app/components/form';
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

  it('names the closed trigger by the label and the value when the label is hidden', () => {
    renderSelect({ showLabel: false });

    expect(screen.getByRole('combobox', { name: 'Fruit: Apple' })).toBeTruthy();
  });
});

describe('Select in a FormField', () => {
  it('is the control the field label names', () => {
    render(
      <FormField label="Fruit" description="Pick one">
        <Select label="Fruit" showLabel={false} options={FRUIT} value="apple" onChange={() => {}} />
      </FormField>,
    );

    const trigger = screen.getByLabelText('Fruit');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(screen.getByRole('combobox', { name: 'Fruit: Apple' })).toBe(trigger);
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByText('Pick one').id);
  });

  it('carries the field error: invalid, and described by the message', () => {
    render(
      <FormField label="Fruit" error="Pick a fruit">
        <Select label="Fruit" showLabel={false} options={FRUIT} value="apple" onChange={() => {}} />
      </FormField>,
    );

    const trigger = screen.getByLabelText('Fruit');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });
});
