/**
 * Tests for HdsToggle — checked/onChange (boolean), disabled, ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { HdsToggle } from './toggle';

afterEach(cleanup);

describe('HdsToggle', () => {
  it('renders a labelled checkbox reflecting the checked prop', () => {
    render(<HdsToggle label="Wi-Fi" checked onChange={() => {}} />);
    expect((screen.getByRole('checkbox', { name: 'Wi-Fi' }) as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with the toggled boolean', () => {
    const onChange = vi.fn();
    render(<HdsToggle label="Wi-Fi" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disables the underlying input', () => {
    render(<HdsToggle label="Wi-Fi" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<HdsToggle ref={ref} label="Wi-Fi" checked={false} onChange={() => {}} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});
