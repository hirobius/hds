/**
 * Contract test: Combobox
 * The open popover has an accessible name (hds#399). It is Popover.Content,
 * role="dialog", which names nothing itself, so Combobox names it the way it
 * already names the listbox inside it: by the field label (the aria-label
 * prop), falling back to the placeholder. An empty aria-label falls back too
 * (hds#408).
 *
 * Inside a FormField, the field's <label for> reaches the trigger: Combobox
 * forwards `id`, `aria-describedby` and `aria-invalid` to it (hds#408).
 *
 * What a screen reader speaks for the same markup is pinned in
 * screen-reader.contract.test.tsx.
 *
 * @primitive Combobox
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Combobox, type ComboboxProps } from '@/app/components/combobox';
import { FormField } from '@/app/components/form';
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

  it('names the open popover dialog by the placeholder when the field label is empty', async () => {
    renderCombobox({ 'aria-label': '', placeholder: 'Pick a fruit' });
    await open();

    expect(await screen.findByRole('dialog', { name: 'Pick a fruit' })).toBeTruthy();
    expect(screen.getByRole('listbox', { name: 'Pick a fruit' })).toBeTruthy();
  });
});

describe('Combobox listbox', () => {
  // axe fails a listbox that holds text but no option (aria-required-children,
  // critical), so the no-results message sits beside the listbox (hds#407).
  it('keeps the no-results message out of the listbox', async () => {
    renderCombobox({ 'aria-label': 'Fruit', emptyMessage: 'No fruit' });
    await open();
    await user().keyboard('zzz');

    const listbox = await screen.findByRole('listbox', { name: 'Fruit' });
    expect(screen.getByText('No fruit')).toBeTruthy();
    expect(listbox.textContent).toBe('');
  });
});

describe('Combobox in a FormField', () => {
  it('is the control the field label names', () => {
    render(
      <FormField label="Fruit" description="Pick one">
        <Combobox options={FRUIT} value={null} onChange={() => {}} />
      </FormField>,
    );

    const trigger = screen.getByLabelText('Fruit');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBe(trigger);
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByText('Pick one').id);
  });

  it('carries the field error: invalid, and described by the message', () => {
    render(
      <FormField label="Fruit" error="Pick a fruit">
        <Combobox options={FRUIT} value={null} onChange={() => {}} />
      </FormField>,
    );

    const trigger = screen.getByLabelText('Fruit');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
  });
});
