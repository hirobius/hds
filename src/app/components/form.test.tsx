/**
 * Tests for Form + FormField — label↔control association and the a11y wiring
 * (aria-invalid, aria-describedby, required). Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, renderHook } from '@testing-library/react';
import { Form, FormField, useFieldWiring } from './form';

afterEach(cleanup);

describe('Form', () => {
  it('renders a form element', () => {
    const { container } = render(
      <Form aria-label="settings">
        <button type="submit">Save</button>
      </Form>,
    );
    expect(container.querySelector('form')).not.toBeNull();
  });
});

describe('FormField', () => {
  it('associates the label with the control', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
  });

  it('links a description via aria-describedby (no error)', () => {
    render(
      <FormField label="Email" description="We never share it.">
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const desc = document.getElementById(describedBy as string);
    expect(desc?.textContent).toBe('We never share it.');
  });

  it('sets aria-invalid and links the error (which has role=alert)', () => {
    render(
      <FormField label="Email" error="Required field">
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Required field');
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('drops the description id while an error replaces it, so nothing dangles', () => {
    render(
      <FormField label="Email" description="We never share it." error="Required field">
        <input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    expect(ids).toHaveLength(1);
    expect(document.getElementById(ids[0])?.textContent).toBe('Required field');
  });

  it('useFieldWiring only lists the description when it renders', () => {
    const { result: withErr } = renderHook(() =>
      useFieldWiring({ htmlFor: 'f', description: 'help', error: 'bad' }),
    );
    expect(withErr.current.describedBy).toBe('f-error');
    const { result: noErr } = renderHook(() =>
      useFieldWiring({ htmlFor: 'f', description: 'help' }),
    );
    expect(noErr.current.describedBy).toBe('f-description');
  });

  it('marks the control required and shows the asterisk', () => {
    render(
      <FormField label="Email" required>
        <input />
      </FormField>,
    );
    // The asterisk is aria-hidden, so query the control by role (not label text).
    expect((screen.getByRole('textbox') as HTMLInputElement).required).toBe(true);
    expect(screen.getByText('*')).not.toBeNull();
  });

  it('preserves a control’s own id when provided', () => {
    render(
      <FormField label="Email">
        <input id="custom-email" />
      </FormField>,
    );
    expect((screen.getByLabelText('Email') as HTMLInputElement).id).toBe('custom-email');
  });
});
