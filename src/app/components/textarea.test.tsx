/**
 * Tests for Textarea — label wiring and aria-describedby targets.
 * Plain-DOM assertions (no jest-dom matchers).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Textarea } from './textarea';

afterEach(cleanup);

describe('Textarea', () => {
  it('labels the textarea', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message').tagName).toBe('TEXTAREA');
  });

  it('points aria-describedby at the helper while it renders', () => {
    render(<Textarea label="Message" helperText="Max 200 characters." />);
    const id = screen.getByLabelText('Message').getAttribute('aria-describedby') as string;
    expect(document.getElementById(id)?.textContent).toBe('Max 200 characters.');
  });

  it('drops the helper id while an error replaces it, so nothing dangles', () => {
    render(
      <Textarea label="Message" helperText="Max 200 characters." error errorMessage="Too long" />,
    );
    const ids = (screen.getByLabelText('Message').getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean);
    expect(ids).toHaveLength(1);
    expect(document.getElementById(ids[0])?.textContent).toBe('Too long');
  });

  it('has no aria-describedby when there is nothing to describe it', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message').getAttribute('aria-describedby')).toBeNull();
  });
});
