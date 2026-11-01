/**
 * Tests for Combobox — trigger label, open/filter/select, keyboard, empty state.
 * Plain-DOM assertions (no jest-dom matchers).
 *
 * Built on Popover (Radix/Floating-UI) — polyfill the jsdom-missing APIs.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { createRef, useState } from 'react';
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

  it('a11y:combobox.chips-named - shows the selection as a count on the trigger and one named chip per value', () => {
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

  it('a11y:combobox.options-not-tabbable - keeps options out of the tab order (focus stays on the search field)', () => {
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

  it('a11y:combobox.skips-disabled - skips disabled options with ArrowDown / ArrowUp', () => {
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

// ── creatable chip input (hds#871) ───────────────────────────────────────────

const SKILLS: ComboboxOption[] = [
  { value: 'react', label: 'React' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
];

function CreatableExample({
  start = [],
  onCreate,
}: { start?: string[]; onCreate?: (text: string) => void } = {}) {
  const [value, setValue] = useState<string[]>(start);
  return (
    <Combobox
      multiple
      creatable
      aria-label="Skills"
      options={SKILLS}
      value={value}
      onChange={setValue}
      onCreate={(text) => {
        onCreate?.(text);
        setValue((v) => [...v, text]);
      }}
    />
  );
}

describe('Combobox creatable', () => {
  const input = () => screen.getByRole('combobox', { name: 'Skills' });
  const type = (text: string) => fireEvent.change(input(), { target: { value: text } });

  it('a11y:combobox.creatable-input-combobox - the input is the combobox: a listbox popup that reports expanded and what it controls', () => {
    render(<CreatableExample />);
    expect(input().tagName).toBe('INPUT');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-autocomplete')).toBe('list');
    type('r');
    expect(input().getAttribute('aria-expanded')).toBe('true');
    const listbox = screen.getByRole('listbox');
    expect(input().getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true');
    expect(listbox.getAttribute('aria-label')).toBe('Skills');
    expect(input().getAttribute('aria-activedescendant')).toBe(
      screen.getAllByRole('option').at(-1)?.id,
    );
  });

  it('suggests matching options as you type', () => {
    render(<CreatableExample />);
    type('r');
    expect(screen.getByRole('option', { name: 'React' })).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Rust' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'SQL' })).toBeNull();
  });

  it('a11y:combobox.creatable-enter-adds - Enter creates the typed text and clears the field', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('Figma');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).toHaveBeenCalledWith('Figma');
    expect((input() as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'Remove Figma' })).not.toBeNull();
  });

  it('trims the typed text and ignores blank input', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('   ');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
    type('  Go  ');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).toHaveBeenCalledWith('Go');
  });

  it('a11y:combobox.creatable-add-option - offers Add “text” as the last option when nothing matches exactly', () => {
    render(<CreatableExample />);
    type('Rus');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Rust', 'Add “Rus”']);
    // Typed text wins Enter until an arrow key moves off it.
    expect(input().getAttribute('aria-activedescendant')).toBe(options[1].id);
  });

  it('creates when the Add option is clicked', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('Zig');
    fireEvent.click(screen.getByRole('option', { name: 'Add “Zig”' }));
    expect(onCreate).toHaveBeenCalledWith('Zig');
  });

  it('shows no Add option when the text matches an option label exactly, and Enter picks that option', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('rust');
    expect(screen.queryByRole('option', { name: /^Add / })).toBeNull();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Rust' })).not.toBeNull();
  });

  it('ArrowUp moves from the Add option to a suggestion, and Enter picks it', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('Rus');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove Rust' })).not.toBeNull();
  });

  it('a11y:combobox.creatable-chips-inline - renders each value as a named chip before the input, inside the field', () => {
    render(<CreatableExample start={['react', 'Figma']} />);
    const chips = screen.getAllByRole('button', { name: /^Remove / });
    expect(chips.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Remove React',
      'Remove Figma',
    ]);
    const group = screen.getByRole('group', { name: 'Skills' });
    expect(group.contains(input())).toBe(true);
    for (const chip of chips) {
      expect(chip.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('removes a chip from its button and puts focus back in the input', () => {
    render(<CreatableExample start={['react', 'sql']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove React' }));
    expect(screen.queryByRole('button', { name: 'Remove React' })).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  it('a11y:combobox.creatable-backspace-removes - Backspace in an empty input removes the last chip', () => {
    render(<CreatableExample start={['react', 'sql']} />);
    input().focus();
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(screen.queryByRole('button', { name: 'Remove SQL' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove React' })).not.toBeNull();
  });

  it('keeps chips when Backspace is pressed with text in the input', () => {
    render(<CreatableExample start={['react']} />);
    type('ab');
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(screen.getByRole('button', { name: 'Remove React' })).not.toBeNull();
  });

  it('toggles a suggestion with Enter and keeps the list open', () => {
    render(<CreatableExample />);
    type('sq');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Remove SQL' })).not.toBeNull();
    expect(screen.getByRole('listbox')).not.toBeNull();
  });

  it('closes on Escape and keeps the chips', () => {
    render(<CreatableExample start={['react']} />);
    type('r');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove React' })).not.toBeNull();
  });

  it('a11y:combobox.creatable-result-count-announced - announces the match count in a polite status', () => {
    render(<CreatableExample />);
    type('r');
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('2 results');
  });

  it('Enter on an exact (case-insensitive) match picks it, not the first partial match', () => {
    const onChange = vi.fn();
    render(
      <Combobox
        multiple
        creatable
        aria-label="Skills"
        options={[
          { value: 'js', label: 'JavaScript' },
          { value: 'java', label: 'Java' },
        ]}
        value={[]}
        onChange={onChange}
        onCreate={() => {}}
      />,
    );
    type('java');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['java']);
  });

  it('a second Enter on the emptied field does nothing instead of removing a chip', () => {
    const onChange = vi.fn();
    function Example() {
      const [value, setValue] = useState<string[]>(['react']);
      return (
        <Combobox
          multiple
          creatable
          aria-label="Skills"
          options={SKILLS}
          value={value}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
          onCreate={(t) => setValue((x) => [...x, t])}
        />
      );
    }
    render(<Example />);
    type('Zig');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Remove Zig' })).not.toBeNull();
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Remove React' })).not.toBeNull();
    // An arrow key then highlights a row, and Enter acts on it.
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(input().getAttribute('aria-activedescendant')).not.toBeNull();
  });

  it('forwards ref to the input in creatable mode', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Combobox
        ref={ref}
        multiple
        creatable
        aria-label="Skills"
        options={SKILLS}
        value={[]}
        onChange={() => {}}
        onCreate={() => {}}
      />,
    );
    expect(ref.current).toBe(input());
  });

  it('Enter after Escape still adds the typed text', () => {
    const onCreate = vi.fn();
    render(<CreatableExample onCreate={onCreate} />);
    type('Figma');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onCreate).toHaveBeenCalledWith('Figma');
  });

  it('announces the Add option instead of "0 results" when only that row shows', () => {
    render(<CreatableExample />);
    type('Figma');
    expect(screen.getByRole('status').textContent).toBe('Add “Figma”');
  });

  it('does not change the existing multiple behaviour without creatable', () => {
    render(<MultiExample />);
    expect(screen.getByRole('combobox', { name: 'Countries' }).tagName).toBe('BUTTON');
  });
});
