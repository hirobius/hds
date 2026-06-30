/**
 * Tests for HdsRadio — checked/onChange (boolean), disabled, ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsRadio } from './radio';

afterEach(cleanup);

describe('HdsRadio', () => {
  it('renders a labelled radio reflecting the checked prop', () => {
    render(<HdsRadio label="Card" checked onChange={() => {}} />);
    expect((screen.getByRole('radio', { name: 'Card' }) as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with true when an unchecked radio is selected', () => {
    const onChange = vi.fn();
    render(<HdsRadio label="Card" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disables the underlying input', () => {
    render(<HdsRadio label="Card" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('radio') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<HdsRadio ref={ref} label="Card" checked={false} onChange={() => {}} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});
