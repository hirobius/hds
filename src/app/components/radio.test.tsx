/**
 * Tests for Radio — checked/onChange (boolean), disabled, ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Radio } from './radio';

afterEach(cleanup);

describe('Radio', () => {
  it('renders a labelled radio reflecting the checked prop', () => {
    render(<Radio label="Card" checked onChange={() => {}} />);
    expect((screen.getByRole('radio', { name: 'Card' }) as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with true when an unchecked radio is selected', () => {
    const onChange = vi.fn();
    render(<Radio label="Card" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disables the underlying input', () => {
    render(<Radio label="Card" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('radio') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Radio ref={ref} label="Card" checked={false} onChange={() => {}} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});
