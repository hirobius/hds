import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Combobox } from '../../app/components/combobox';
import { Select } from '../../app/components/select';
import { openListbox } from './open-listbox';

afterEach(cleanup);

const FRUIT = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
];

describe('openListbox', () => {
  it('opens a Combobox and resolves to its listbox', async () => {
    const { container } = render(
      <Combobox aria-label="Fruit" options={FRUIT} value={null} onChange={() => {}} />,
    );

    const listbox = await openListbox(container);
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('aria-label')).toBe('Fruit');
  });

  it('opens a Select and resolves to its listbox', async () => {
    const { container } = render(
      <Select label="Fruit" options={FRUIT} value="apple" onChange={() => {}} />,
    );

    const listbox = await openListbox(container);
    expect(listbox.getAttribute('role')).toBe('listbox');
  });

  it('fails when no listbox opens, so a story never scans as open while closed', async () => {
    const { container } = render(
      <button type="button" role="combobox" aria-expanded={false} aria-controls="none">
        Inert
      </button>,
    );

    await expect(openListbox(container, { timeoutMs: 50 })).rejects.toThrow(
      'no listbox opened within 50 ms',
    );
  });
});
