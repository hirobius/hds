/**
 * Tests for Combobox — trigger label, open/filter/select, keyboard, empty state.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix/Floating-UI) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Combobox, type ComboboxOption } from './combobox';

beforeAll(() => {
  // @ts-expect-error — minimal jsdom polyfills for Radix/Floating-UI.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(cleanup);

const OPTIONS: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'mx', label: 'Mexico' },
];

function Example({ start = null }: { start?: string | null } = {}) {
  const [value, setValue] = useState<string | null>(start);
  return <Combobox aria-label="Country" options={OPTIONS} value={value} onChange={setValue} />;
}

describe('Combobox', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<Example />);
    expect(screen.getByRole('combobox', { name: 'Country' }).textContent).toContain('Select');
  });

  it('shows the selected option label on the trigger', () => {
    render(<Example start="ca" />);
    expect(screen.getByRole('combobox', { name: 'Country' }).textContent).toContain('Canada');
  });

  it('opens a listbox of options on click', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    expect(screen.getByRole('listbox')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'United States' })).not.toBeNull();
  });

  it('filters options by the search query', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'can' } });
    expect(screen.getByRole('option', { name: 'Canada' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'United States' })).toBeNull();
  });

  it('selects an option on click and reflects it on the trigger', () => {
    const onChange = vi.fn();
    render(<Combobox aria-label="Country" options={OPTIONS} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.click(screen.getByRole('option', { name: 'Mexico' }));
    expect(onChange).toHaveBeenCalledWith('mx');
  });

  it('shows the empty message when nothing matches', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzz' } });
    expect(screen.getByText('No results')).not.toBeNull();
  });
});

describe('Combobox highlighted row ring', () => {
  it('draws a 2px inset ring on the active option', () => {
    render(<Example />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Country' }));
    const cls = screen.getAllByRole('option')[0].className;
    expect(cls).toContain('data-[active=true]:ring-2');
    expect(cls).toContain('data-[active=true]:ring-inset');
    expect(cls).toContain('data-[active=true]:ring-ring');
  });
});

// ── multiple (hds#393) ───────────────────────────────────────────────────────

function MultiExample({ start = [] }: { start?: string[] } = {}) {
  const [value, setValue] = useState<string[]>(start);
  return (
    <Combobox multiple aria-label="Countries" options={OPTIONS} value={value} onChange={setValue} />
  );
}

describe('Combobox multiple', () => {
  it('adds each clicked option and keeps the list open', () => {
    render(<MultiExample />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Countries' }));
    fireEvent.click(screen.getByRole('option', { name: 'Canada' }));
    fireEvent.click(screen.getByRole('option', { name: 'Mexico' }));

    expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');
    const selected = (name: string) =>
      screen.getByRole('option', { name }).getAttribute('aria-selected');
    expect(selected('United States')).toBe('false');
    expect(selected('Canada')).toBe('true');
    expect(selected('Mexico')).toBe('true');
  });

  it('removes a selected option when it is clicked again', () => {
    const onChange = vi.fn();
    render(
      <Combobox
        multiple
        aria-label="Countries"
        options={OPTIONS}
        value={['us', 'ca']}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('combobox', { name: 'Countries' }));
    fireEvent.click(screen.getByRole('option', { name: 'United States' }));
    expect(onChange).toHaveBeenCalledWith(['ca']);
  });

  it('shows the placeholder on the trigger when nothing is selected', () => {
    render(<MultiExample />);
    const trigger = screen.getByRole('combobox', { name: 'Countries' });
    expect(trigger.textContent).toContain('Select');
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });

  it('shows the selection as a count on the trigger and one named chip per value', () => {
    render(<MultiExample start={['us', 'ca']} />);
    expect(screen.getByRole('combobox', { name: 'Countries' }).textContent).toContain('2 selected');
    const chips = screen.getAllByRole('button', { name: /^Remove / });
    expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Remove United States',
      'Remove Canada',
    ]);
    expect(chips.map((chip) => chip.textContent)).toEqual(['United States', 'Canada']);
  });

  it('removes a value from its chip without opening the list', () => {
    render(<MultiExample start={['us', 'ca']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Canada' }));

    expect(screen.queryByRole('button', { name: 'Remove Canada' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove United States' })).not.toBeNull();
    expect(screen.getByRole('combobox', { name: 'Countries' }).textContent).toContain('1 selected');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Combobox close contract (hds#— bugfix)', () => {
  // The close-then-reopen bug was a browser pointerdown behavior (trigger was a
  // Popover.Anchor, so Radix treated a pointerdown on it as an outside dismissal
  // and the onClick immediately reopened). jsdom clicks can't exercise that path,
  // but this guards the "clicking the trigger closes an open list" contract.
  it('closes the listbox when the trigger is clicked again', () => {
    render(<Example />);
    const trigger = screen.getByRole('combobox', { name: 'Country' });
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).not.toBeNull();
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

// ── keyboard / a11y fixes ────────────────────────────────────────────────────

describe('Combobox keyboard a11y', () => {
  const trigger = () => screen.getByRole('combobox', { name: 'Country' });
  const search = () => screen.getByPlaceholderText('Search…');
  const activeId = () => search().getAttribute('aria-activedescendant');
  const activeLabel = () => document.getElementById(activeId() as string)?.textContent;

  it('keeps options out of the tab order (focus stays on the search field)', () => {
    render(<Example />);
    fireEvent.click(trigger());
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('builds option ids from the index, so values with spaces/special chars stay valid', () => {
    const odd: ComboboxOption[] = [
      { value: 'new york', label: 'New York' },
      { value: 'a/b:c"d', label: 'Slashy' },
    ];
    render(<Combobox aria-label="Country" options={odd} value={null} onChange={() => {}} />);
    fireEvent.click(trigger());
    const ids = screen.getAllByRole('option').map((o) => o.id);
    for (const id of ids) {
      expect(id).not.toMatch(/\s/);
      expect(id).toMatch(/^[^\s"/]+$/);
    }
    expect(new Set(ids).size).toBe(ids.length);
    expect(activeLabel()).toBe('New York');
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(activeLabel()).toBe('Slashy');
  });

  it('scrolls the active option into view (nearest) on keyboard navigation', () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
    render(<Example />);
    fireEvent.click(trigger());
    spy.mockClear();
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(spy).toHaveBeenCalledWith({ block: 'nearest' });
    expect((spy.mock.contexts.at(-1) as HTMLElement).textContent).toBe('Canada');
    spy.mockRestore();
  });

  it('resets the active option to the first when the list is reopened', () => {
    render(<Example />);
    fireEvent.click(trigger());
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(activeLabel()).toBe('Mexico');
    fireEvent.click(trigger()); // close
    fireEvent.click(trigger()); // reopen
    expect(activeLabel()).toBe('United States');
  });

  it('resets the active option when the options change', () => {
    const { rerender } = render(
      <Combobox aria-label="Country" options={OPTIONS} value={null} onChange={() => {}} />,
    );
    fireEvent.click(trigger());
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(activeLabel()).toBe('Mexico');
    rerender(
      <Combobox
        aria-label="Country"
        options={[
          { value: 'fr', label: 'France' },
          { value: 'de', label: 'Germany' },
        ]}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(activeLabel()).toBe('France');
  });

  it('does not reset the active option when the parent re-renders with equal options', () => {
    const make = () => OPTIONS.map((o) => ({ ...o }));
    const { rerender } = render(
      <Combobox aria-label="Country" options={make()} value={null} onChange={() => {}} />,
    );
    fireEvent.click(trigger());
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    rerender(<Combobox aria-label="Country" options={make()} value={null} onChange={() => {}} />);
    expect(activeLabel()).toBe('Canada');
  });

  it('skips disabled options with ArrowDown / ArrowUp', () => {
    const opts: ComboboxOption[] = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo', disabled: true },
      { value: 'c', label: 'Charlie' },
    ];
    render(<Combobox aria-label="Country" options={opts} value={null} onChange={() => {}} />);
    fireEvent.click(trigger());
    expect(activeLabel()).toBe('Alpha');
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(activeLabel()).toBe('Charlie');
    fireEvent.keyDown(search(), { key: 'ArrowUp' });
    expect(activeLabel()).toBe('Alpha');
    fireEvent.keyDown(search(), { key: 'ArrowUp' }); // wraps past the end, skipping nothing disabled
    expect(activeLabel()).toBe('Charlie');
  });

  it('starts on the first enabled option when the first is disabled', () => {
    const opts: ComboboxOption[] = [
      { value: 'a', label: 'Alpha', disabled: true },
      { value: 'b', label: 'Bravo' },
    ];
    render(<Combobox aria-label="Country" options={opts} value={null} onChange={() => {}} />);
    fireEvent.click(trigger());
    expect(activeLabel()).toBe('Bravo');
  });

  it('does not loop when every option is disabled', () => {
    const opts: ComboboxOption[] = [{ value: 'a', label: 'Alpha', disabled: true }];
    render(<Combobox aria-label="Country" options={opts} value={null} onChange={() => {}} />);
    fireEvent.click(trigger());
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(screen.getByRole('listbox')).not.toBeNull();
  });
});
