/**
 * Tests for Textarea — label wiring, value/onChange, disabled, error a11y, ref.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Textarea } from './textarea';

afterEach(cleanup);

describe('Textarea', () => {
  it('renders a labelled textarea', () => {
    render(<Textarea label="Bio" />);
    expect(screen.getByRole('textbox', { name: 'Bio' }).tagName).toBe('TEXTAREA');
  });

  it('fires onChange with typed value', () => {
    const onChange = vi.fn();
    render(<Textarea label="Bio" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Bio' }), {
      target: { value: 'hello' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('disables the underlying textarea', () => {
    render(<Textarea label="Bio" disabled />);
    expect((screen.getByRole('textbox', { name: 'Bio' }) as HTMLTextAreaElement).disabled).toBe(
      true,
    );
  });

  it('wires aria-invalid + error message when in error', () => {
    render(<Textarea label="Bio" error errorMessage="Too short" />);
    const ta = screen.getByRole('textbox', { name: 'Bio' });
    expect(ta.getAttribute('aria-invalid')).toBe('true');
    const err = screen.getByRole('alert');
    expect(err.textContent).toBe('Too short');
    expect(ta.getAttribute('aria-describedby')).toContain(err.id);
  });

  it('wires helper text via aria-describedby when not in error', () => {
    render(<Textarea label="Bio" helperText="Max 500 chars" />);
    const ta = screen.getByRole('textbox', { name: 'Bio' });
    const hint = screen.getByText('Max 500 chars');
    expect(ta.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('forwards its ref to the textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} label="Bio" />);
    expect(ref.current?.tagName).toBe('TEXTAREA');
  });
});
