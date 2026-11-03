/**
 * FormField wiring checks shared by the Select and Combobox contract suites
 * (hds#408, hds#1011): the field's <label for> reaches the control's trigger,
 * and its description or error is what the trigger is described by.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import type { ReactElement } from 'react';
import { expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/app/components/form';

/** Render `control` in a "Fruit" field with a description; the trigger is the combobox `name`. */
export function expectFieldLabelsTrigger(control: ReactElement, name: string) {
  render(
    <FormField label="Fruit" description="Pick one">
      {control}
    </FormField>,
  );

  const trigger = screen.getByLabelText('Fruit');
  expect(trigger.getAttribute('role')).toBe('combobox');
  expect(screen.getByRole('combobox', { name })).toBe(trigger);
  expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByText('Pick one').id);
}

/** Render `control` in a "Fruit" field with an error; the trigger is invalid and described by it. */
export function expectFieldErrorOnTrigger(control: ReactElement) {
  render(
    <FormField label="Fruit" error="Pick a fruit">
      {control}
    </FormField>,
  );

  const trigger = screen.getByLabelText('Fruit');
  expect(trigger.getAttribute('aria-invalid')).toBe('true');
  expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
}
