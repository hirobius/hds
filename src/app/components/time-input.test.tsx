import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TimeInput } from './time-input';

afterEach(cleanup);

describe('TimeInput', () => {
  it('renders a native time input', () => {
    const { container } = render(<TimeInput aria-label="Start time" />);
    const input = container.querySelector('input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('time');
  });

  it('reflects a controlled value', () => {
    render(<TimeInput aria-label="t" value="09:30" onChange={() => {}} />);
    expect((screen.getByLabelText('t') as HTMLInputElement).value).toBe('09:30');
  });

  it('can be disabled', () => {
    render(<TimeInput aria-label="t" disabled />);
    expect((screen.getByLabelText('t') as HTMLInputElement).disabled).toBe(true);
  });
});
