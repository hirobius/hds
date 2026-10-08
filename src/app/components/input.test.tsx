import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Input } from './input';

afterEach(cleanup);

describe('Input date and time types (hds#393)', () => {
  it('still offers a clear button on a filled text field', () => {
    render(<Input label="Name" defaultValue="Ada" />);
    expect(screen.queryByRole('button', { name: 'Clear input' })).not.toBeNull();
  });

  it.each([
    ['date', '2026-10-01'],
    ['time', '09:30'],
    ['datetime-local', '2026-10-01T09:30'],
  ] as const)('hides the clear button on a filled %s field', (type, value) => {
    render(<Input type={type} label="When" defaultValue={value} />);
    const field = screen.getByLabelText('When') as HTMLInputElement;
    expect(field.type).toBe(type);
    expect(field.value).toBe(value);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Input prefix and suffix slots (hds#393)', () => {
  const isAbsolute = (el: Element) => /(^|\s)absolute(\s|$)/.test(el.className);
  const follows = (a: Node, b: Node) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('renders the prefix and suffix in flow, either side of the field', () => {
    render(<Input label="Website" prefix="https://" suffix=".com" />);
    const field = screen.getByRole('textbox', { name: 'Website' });
    const prefix = screen.getByText('https://');
    const suffix = screen.getByText('.com');

    expect(isAbsolute(prefix)).toBe(false);
    expect(isAbsolute(suffix)).toBe(false);
    // One flex row holds prefix, field and suffix, in that order.
    const row = prefix.parentElement as HTMLElement;
    expect(row.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(row.contains(field)).toBe(true);
    expect(row.contains(suffix)).toBe(true);
    expect(follows(prefix, field)).toBe(true);
    expect(follows(field, suffix)).toBe(true);
  });

  it('keeps the label as the whole accessible name and leaves aria-describedby on the helper', () => {
    render(
      <Input label="Website" prefix="https://" suffix=".com" helperText="Your public homepage." />,
    );
    const field = screen.getByLabelText('Website');
    expect(field.tagName).toBe('INPUT');
    expect(screen.getByRole('textbox', { name: 'Website' })).toBe(field);

    const describedBy = field.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(describedBy?.split(' ')).toHaveLength(1);
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      'Your public homepage.',
    );
  });

  it('leaves the error wiring exactly as it is without slots', () => {
    const props = {
      id: 'weight',
      label: 'Weight',
      type: 'number',
      helperText: 'Up to 30 kg.',
      error: true,
      errorMessage: 'Too heavy.',
      defaultValue: '40',
    } as const;
    const wiring = (el: HTMLElement) =>
      ['aria-describedby', 'aria-errormessage', 'aria-invalid'].map((a) => el.getAttribute(a));

    const { unmount } = render(<Input {...props} />);
    const expected = wiring(screen.getByRole('spinbutton', { name: 'Weight' }));
    unmount();

    render(<Input {...props} suffix="kg" />);
    const field = screen.getByRole('spinbutton', { name: 'Weight' });
    expect(wiring(field)).toEqual(expected);
    const errorId = field.getAttribute('aria-errormessage') as string;
    expect(document.getElementById(errorId)?.textContent).toBe('Too heavy.');
  });

  it('draws the field border on the frame around the slots, destructive when invalid', () => {
    render(<Input label="Weight" suffix="kg" error />);
    const field = screen.getByLabelText('Weight');
    const frame = screen.getByText('kg').parentElement as HTMLElement;
    expect(frame.className).toMatch(/(^|\s)border-destructive(\s|$)/);
    expect(field.className).toMatch(/(^|\s)border-0(\s|$)/);
  });

  it('leaves the absolutely positioned adornments unchanged alongside the slots', () => {
    render(
      <Input
        label="Amount"
        prefix="$"
        leadingVisual={<span data-testid="lead-icon" />}
        trailingVisual={<span data-testid="trail-icon" />}
      />,
    );
    const lead = screen.getByTestId('lead-icon').parentElement as HTMLElement;
    const trail = screen.getByTestId('trail-icon').parentElement as HTMLElement;
    expect(isAbsolute(lead)).toBe(true);
    expect(isAbsolute(trail)).toBe(true);
    expect(isAbsolute(screen.getByText('$'))).toBe(false);
  });

  it('renders no slot wrapper when neither slot is set', () => {
    const { container } = render(<Input label="Plain" />);
    const field = screen.getByLabelText('Plain');
    // The field keeps its own chrome and sits directly in the positioning wrapper.
    expect(field.className).toMatch(/(^|\s)border-input(\s|$)/);
    expect(field.parentElement?.parentElement).toBe(container.firstElementChild);
  });
});

// The field pads each side with its own pl-*/pr-* class. A px-* shorthand next
// to one of those loses either way: tailwind-merge drops the earlier per-side
// class (twMerge('pl-2', 'px-3') is 'px-3'), and in the built CSS px-* can win
// over pr-*. Either way a side loses its inset, and the text can jump sideways
// when the clear button appears.
describe('Input horizontal padding (hds#393 review)', () => {
  const padClasses = (el: Element) => el.className.split(/\s+/).filter((c) => /^p[xlr]?-/.test(c));
  const side = (el: Element, s: 'l' | 'r') => padClasses(el).filter((c) => c.startsWith(`p${s}-`));

  const SIZES = {
    sm: { rest: ['pl-2', 'pr-2'], gap: ['pl-1.5', 'pr-1.5'], lead: 'pl-7', trail: 'pr-7' },
    md: { rest: ['pl-3', 'pr-3'], gap: ['pl-2', 'pr-2'], lead: 'pl-9', trail: 'pr-9' },
    lg: { rest: ['pl-4', 'pr-4'], gap: ['pl-2.5', 'pr-2.5'], lead: 'pl-11', trail: 'pr-11' },
  } as const;

  it.each(Object.keys(SIZES) as Array<keyof typeof SIZES>)(
    'a prefix-only %s field keeps its slot gap after the first keystroke',
    (size) => {
      const pads = SIZES[size];
      render(<Input size={size} label="Website" prefix="https://" />);
      const field = screen.getByLabelText('Website');
      expect(padClasses(field)).toEqual([pads.gap[0], pads.rest[1]]);

      fireEvent.change(field, { target: { value: 'a' } });
      expect(screen.queryByRole('button', { name: 'Clear input' })).not.toBeNull();
      expect(padClasses(field)).toEqual([pads.gap[0], pads.trail]);
    },
  );

  it.each(Object.keys(SIZES) as Array<keyof typeof SIZES>)(
    'gives a %s slot the same gap whether one slot or both are set',
    (size) => {
      const pads = SIZES[size];
      render(
        <>
          <Input size={size} label="Prefix only" prefix="$" />
          <Input size={size} label="Suffix only" suffix="kg" />
          <Input size={size} label="Both" prefix="$" suffix="USD" />
        </>,
      );
      expect(padClasses(screen.getByLabelText('Prefix only'))).toEqual([pads.gap[0], pads.rest[1]]);
      expect(padClasses(screen.getByLabelText('Suffix only'))).toEqual([pads.rest[0], pads.gap[1]]);
      expect(padClasses(screen.getByLabelText('Both'))).toEqual([pads.gap[0], pads.gap[1]]);
    },
  );

  it.each(Object.keys(SIZES) as Array<keyof typeof SIZES>)(
    'keeps the %s leading inset on a leadingVisual field with nothing trailing',
    (size) => {
      const pads = SIZES[size];
      render(<Input size={size} label="Search" leadingVisual={<svg />} />);
      expect(padClasses(screen.getByLabelText('Search'))).toEqual([pads.lead, pads.rest[1]]);
    },
  );

  // Every combination of adornments, slots, value and loading: exactly one
  // class per side and never a px-* shorthand.
  const flags = [
    'leadingVisual',
    'trailingVisual',
    'prefix',
    'suffix',
    'value',
    'loading',
  ] as const;
  const combos = Array.from({ length: 1 << flags.length }, (_, mask) =>
    flags.filter((_, i) => mask & (1 << i)),
  );
  it.each(combos.map((on) => [on.join('+') || 'plain', on] as const))(
    '%s: one pl-* and one pr-* class at every size, no px-*',
    (_name, on) => {
      const has = (f: (typeof flags)[number]) => on.includes(f);
      for (const size of Object.keys(SIZES) as Array<keyof typeof SIZES>) {
        const { unmount } = render(
          <Input
            size={size}
            label="Amount"
            leadingVisual={has('leadingVisual') ? <svg /> : undefined}
            trailingVisual={has('trailingVisual') ? <svg /> : undefined}
            prefix={has('prefix') ? '$' : undefined}
            suffix={has('suffix') ? 'USD' : undefined}
            defaultValue={has('value') ? '12' : undefined}
            loading={has('loading')}
          />,
        );
        const field = screen.getByLabelText('Amount');
        expect(
          padClasses(field).filter((c) => /^px?-/.test(c)),
          size,
        ).toEqual([]);
        expect(side(field, 'l'), size).toHaveLength(1);
        expect(side(field, 'r'), size).toHaveLength(1);
        unmount();
      }
    },
  );

  it('still lets inputClassName override the padding with a px-* shorthand', () => {
    render(<Input label="Code" inputClassName="px-6" defaultValue="x" />);
    expect(padClasses(screen.getByLabelText('Code'))).toEqual(['px-6']);
  });

  it('renders a falsy-but-renderable prefix such as 0', () => {
    render(<Input label="Count" prefix={0} />);
    const zero = screen.getByText('0');
    expect(zero.parentElement?.contains(screen.getByLabelText('Count'))).toBe(true);
  });
});

describe('Input aria-describedby targets (a11y)', () => {
  it('points at the helper while it renders', () => {
    render(<Input label="Email" helperText="We never share it." />);
    const field = screen.getByLabelText('Email');
    const id = field.getAttribute('aria-describedby') as string;
    expect(document.getElementById(id)?.textContent).toBe('We never share it.');
  });

  it('drops the helper id while an error replaces it, so nothing dangles', () => {
    render(<Input label="Email" helperText="We never share it." error errorMessage="Bad email" />);
    const field = screen.getByLabelText('Email');
    const ids = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    expect(ids).toHaveLength(1);
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
    expect(document.getElementById(ids[0])?.textContent).toBe('Bad email');
  });

  it('has no aria-describedby when the error flag has no message and no helper', () => {
    render(<Input label="Email" error />);
    expect(screen.getByLabelText('Email').getAttribute('aria-describedby')).toBeNull();
  });
});

describe('Input loading (a11y)', () => {
  it('stays focusable (readOnly + aria-busy), not disabled, so typing keeps focus', () => {
    render(<Input label="Search" type="search" loading />);
    const field = screen.getByLabelText('Search') as HTMLInputElement;
    expect(field.disabled).toBe(false);
    expect(field.readOnly).toBe(true);
    expect(field.getAttribute('aria-busy')).toBe('true');
    expect(field.getAttribute('aria-disabled')).toBeNull();
    field.focus();
    expect(document.activeElement).toBe(field);
  });

  it('still shows the spinner and hides the clear button while loading', () => {
    const { container } = render(<Input label="Search" defaultValue="abc" loading />);
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('is editable again once loading ends', () => {
    const { rerender } = render(<Input label="Search" loading />);
    rerender(<Input label="Search" loading={false} />);
    const field = screen.getByLabelText('Search') as HTMLInputElement;
    expect(field.readOnly).toBe(false);
    expect(field.getAttribute('aria-busy')).toBeNull();
  });

  it('a real disabled prop still disables', () => {
    render(<Input label="Search" disabled />);
    expect((screen.getByLabelText('Search') as HTMLInputElement).disabled).toBe(true);
  });
});
