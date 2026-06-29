/**
 * Tests for HdsCheckbox — checked/onChange wiring, indeterminate semantics,
 * disabled, and ref forwarding. Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsCheckbox } from './checkbox';

afterEach(cleanup);

describe('HdsCheckbox', () => {
  it('renders a labelled checkbox reflecting the checked prop', () => {
    render(<HdsCheckbox label="Email me updates" checked onChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'Email me updates' }) as HTMLInputElement;
    expect(box.checked).toBe(true);
  });

  it('fires onChange with the toggled value', () => {
    const onChange = vi.fn();
    render(<HdsCheckbox label="Accept" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes aria-checked="mixed" and sets the DOM indeterminate property', () => {
    render(<HdsCheckbox label="Select all" checked={false} indeterminate onChange={() => {}} />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    expect(box.indeterminate).toBe(true);
  });

  it('disables the underlying input when disabled', () => {
    // Note: jsdom's fireEvent.click bypasses the browser's disabled-blocks-events
    // behavior, so assert the contract (the input is disabled) rather than a
    // synthetic click no-op.
    render(<HdsCheckbox label="Unavailable" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the underlying input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<HdsCheckbox ref={ref} label="Ref" checked={false} onChange={() => {}} />);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('INPUT');
  });
});
