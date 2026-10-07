/**
 * Tests for Toggle — checked/onChange (boolean), disabled, ref forwarding.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Toggle } from './toggle';

afterEach(cleanup);

describe('Toggle', () => {
  it('renders a labelled switch reflecting the checked prop', () => {
    render(<Toggle label="Wi-Fi" checked onChange={() => {}} />);
    expect((screen.getByRole('switch', { name: 'Wi-Fi' }) as HTMLInputElement).checked).toBe(true);
  });

  it('fires onChange with the toggled boolean', () => {
    const onChange = vi.fn();
    render(<Toggle label="Wi-Fi" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('disables the underlying input', () => {
    render(<Toggle label="Wi-Fi" checked={false} disabled onChange={() => {}} />);
    expect((screen.getByRole('switch') as HTMLInputElement).disabled).toBe(true);
  });

  it('forwards its ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Toggle ref={ref} label="Wi-Fi" checked={false} onChange={() => {}} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });
});
