/**
 * Render-count guard for Combobox (hds#1145): moving the active option with
 * the keyboard or the mouse re-renders only the option that loses it and the
 * option that gets it, not every option. OptionCheck renders are the probe:
 * each option holds exactly one.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as React from 'react';
import { Combobox, type ComboboxOption } from './combobox';

const probe = vi.hoisted(() => ({ checks: 0 }));

vi.mock('./combobox-list', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./combobox-list')>();
  function OptionCheck(props: React.ComponentProps<typeof actual.OptionCheck>) {
    probe.checks += 1;
    return <actual.OptionCheck {...props} />;
  }
  return { ...actual, OptionCheck };
});

afterEach(cleanup);

const OPTIONS: ComboboxOption[] = Array.from({ length: 40 }, (_, i) => ({
  value: `v${i}`,
  label: `Option ${i}`,
}));

function openList() {
  const onChange = vi.fn();
  render(<Combobox aria-label="Pick" options={OPTIONS} value={null} onChange={onChange} />);
  fireEvent.click(screen.getByRole('combobox', { name: 'Pick' }));
  return { onChange, search: screen.getByPlaceholderText('Search…') };
}

describe('Combobox render count', () => {
  it('ArrowDown re-renders two options, not the whole list', () => {
    const { search } = openList();
    probe.checks = 0;
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(probe.checks).toBeLessThanOrEqual(2);
    expect(screen.getAllByRole('option')[1].getAttribute('data-active')).toBe('true');
  });

  it('hovering an option re-renders two options, not the whole list', () => {
    openList();
    probe.checks = 0;
    const options = screen.getAllByRole('option');
    fireEvent.mouseEnter(options[7]);
    expect(probe.checks).toBeLessThanOrEqual(2);
    expect(options[7].getAttribute('data-active')).toBe('true');
  });

  it('a memoized option still commits through the latest onChange', () => {
    const { onChange } = openList();
    fireEvent.click(screen.getByRole('option', { name: 'Option 4' }));
    expect(onChange).toHaveBeenCalledWith('v4');
  });
});
