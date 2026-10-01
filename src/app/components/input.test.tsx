import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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
