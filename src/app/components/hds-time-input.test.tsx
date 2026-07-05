import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HdsTimeInput } from './hds-time-input';

afterEach(cleanup);

describe('HdsTimeInput', () => {
  it('renders a native time input', () => {
    const { container } = render(<HdsTimeInput aria-label="Start time" />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('time');
  });

  it('reflects a controlled value', () => {
    render(<HdsTimeInput aria-label="t" value="09:30" onChange={() => {}} />);
    expect((screen.getByLabelText('t') as HTMLInputElement).value).toBe('09:30');
  });

  it('can be disabled', () => {
    render(<HdsTimeInput aria-label="t" disabled />);
    expect((screen.getByLabelText('t') as HTMLInputElement).disabled).toBe(true);
  });
});
