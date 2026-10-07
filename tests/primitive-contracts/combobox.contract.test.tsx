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
import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
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

// ── multiple (hds#393) ──────────────────────────────────────────────────────
// Multi-select keeps the listbox semantics: the listbox is aria-multiselectable
// and every option carries aria-selected. Enter toggles the active option and
// the list stays open, so several can be picked from the keyboard.

function MultiFixture({ start = [] }: { start?: string[] }) {
  const [value, setValue] = useState<string[]>(start);
  return (
    <>
      <Combobox multiple aria-label="Fruit" options={FRUIT} value={value} onChange={setValue} />
      <output data-testid="value">{value.join(',')}</output>
    </>
  );
}

const picked = () => screen.getByTestId('value').textContent;
const isSelected = (name: string) =>
  screen.getByRole('option', { name }).getAttribute('aria-selected');

async function openMulti() {
  await open();
  const search = await screen.findByRole('combobox', { name: 'Search…' });
  await waitFor(() => expect(document.activeElement).toBe(search));
}

describe('Combobox multiple, keyboard', () => {
  it('Enter toggles the active option on and keeps the list open for the next pick', async () => {
    render(<MultiFixture />);
    await openMulti();
    const u = user();

    await u.keyboard('{Enter}');
    await u.keyboard('{ArrowDown}{Enter}');

    expect(picked()).toBe('apple,banana');
    expect(
      screen.getByRole('listbox', { name: 'Fruit' }).getAttribute('aria-multiselectable'),
    ).toBe('true');
    expect(isSelected('Apple')).toBe('true');
    expect(isSelected('Banana')).toBe('true');
    expect(isSelected('Cherry')).toBe('false');
  });

  it('Enter on a selected option deselects it', async () => {
    render(<MultiFixture start={['apple', 'cherry']} />);
    await openMulti();

    await user().keyboard('{Enter}');

    expect(picked()).toBe('cherry');
    expect(isSelected('Apple')).toBe('false');
  });

  it('Escape closes the list and keeps the selection', async () => {
    render(<MultiFixture start={['banana']} />);
    await openMulti();

    await user().keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(picked()).toBe('banana');
    expect(screen.getByRole('combobox', { name: 'Fruit' }).textContent).toContain('1 selected');
  });

  it('removes a value from its chip with the keyboard and keeps focus on the chips', async () => {
    render(<MultiFixture start={['apple', 'banana', 'cherry']} />);
    const u = user();
    screen.getByRole('button', { name: 'Remove Banana' }).focus();

    await u.keyboard('{Enter}');

    expect(picked()).toBe('apple,cherry');
    // Focus moves to the chip that took its place, not to the page.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Cherry' })),
    );

    await u.keyboard(' ');
    expect(picked()).toBe('apple');
    // The last chip went: focus steps back to the one before it.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove Apple' })),
    );

    await u.keyboard('{Enter}');
    expect(picked()).toBe('');
    // No chips left: focus returns to the trigger.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Fruit' })),
    );
  });
});
