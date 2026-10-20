/**
 * Tests for TokenField (hds#826): drive it as a person would and assert the
 * string onChange reports and what assistive tech is told. Real caret motion
 * needs a browser; jsdom covers the edit model, the wiring and the handle.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { TokenField, type TokenFieldHandle, type TokenFieldProps } from './token-field';

afterEach(cleanup);

function Harness({
  initial,
  onValue,
  handle,
  ...props
}: Partial<TokenFieldProps> & {
  initial: string;
  onValue?: (v: string) => void;
  handle?: React.Ref<TokenFieldHandle>;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <TokenField
      ref={handle}
      label="Message"
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

function setup(initial: string, props: Partial<TokenFieldProps> = {}) {
  const onValue = vi.fn();
  const ref = React.createRef<TokenFieldHandle>();
  render(<Harness initial={initial} onValue={onValue} handle={ref} {...props} />);
  const field = screen.getByRole('textbox', { name: 'Message' });
  const caret = (at: number) => act(() => ref.current!.setSelection(at));
  return { field, onValue, ref, caret };
}

describe('TokenField', () => {
  it('draws each token as one chip announced as a unit', () => {
    setup('Hi [Name], from [Company]');
    expect(screen.getByRole('img', { name: 'Name variable' }).textContent).toBe('Name');
    expect(screen.getByRole('img', { name: 'Company variable' })).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Message' }).textContent).toBe(
      'Hi Name, from Company',
    );
  });

  it('is a multi-line textbox in the tab order, named by its label', () => {
    const { field } = setup('');
    expect(field.getAttribute('aria-multiline')).toBe('true');
    expect(field.getAttribute('tabindex')).toBe('0');
    expect(field.getAttribute('contenteditable')).toBe('true');
  });

  it('Backspace just after a chip removes the whole token', () => {
    const { field, onValue, caret } = setup('Hi [Name]!');
    caret(9);
    fireEvent.keyDown(field, { key: 'Backspace' });
    expect(onValue).toHaveBeenLastCalledWith('Hi !');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('Delete just before a chip removes the whole token', () => {
    const { field, onValue, caret } = setup('Hi [Name]!');
    caret(3);
    fireEvent.keyDown(field, { key: 'Delete' });
    expect(onValue).toHaveBeenLastCalledWith('Hi !');
  });

  it('leaves Backspace away from a chip to the browser', () => {
    const { field, onValue, caret } = setup('Hi [Name]!');
    caret(2);
    expect(fireEvent.keyDown(field, { key: 'Backspace' })).toBe(true);
    expect(onValue).not.toHaveBeenCalled();
  });

  it('Enter inserts a line break', () => {
    const { field, onValue, caret } = setup('ab');
    caret(1);
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onValue).toHaveBeenLastCalledWith('a\nb');
  });

  it('pastes plain text, and tokens in it become chips', () => {
    const { field, onValue, caret } = setup('Hi ');
    caret(3);
    fireEvent.paste(field, { clipboardData: { getData: () => 'dear [Contact]\r\n' } });
    expect(onValue).toHaveBeenLastCalledWith('Hi dear [Contact]\n');
    expect(screen.getByRole('img', { name: 'Contact variable' })).not.toBeNull();
  });

  it('insertAt puts text at the last selection', () => {
    const { onValue, ref, caret } = setup('Hello !');
    caret(6);
    act(() => ref.current!.insertAt('[Name]'));
    expect(onValue).toHaveBeenLastCalledWith('Hello [Name]!');
    expect(ref.current!.getSelection()).toEqual({ start: 12, end: 12 });
  });

  it('insertAt with no selection goes on the end', () => {
    const { onValue, ref } = setup('Hi');
    act(() => ref.current!.insertAt(' [Name]'));
    expect(onValue).toHaveBeenLastCalledWith('Hi [Name]');
  });

  it('undo restores a removed chip, and redo removes it again', () => {
    const { field, onValue, caret } = setup('Hi [Name]');
    caret(9);
    fireEvent.keyDown(field, { key: 'Backspace' });
    fireEvent.keyDown(field, { key: 'z', ctrlKey: true });
    expect(onValue).toHaveBeenLastCalledWith('Hi [Name]');
    fireEvent.keyDown(field, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(onValue).toHaveBeenLastCalledWith('Hi ');
  });

  it('redraws when the value changes from outside', () => {
    const { rerender } = render(<TokenField label="Message" value="a" onChange={() => {}} />);
    rerender(<TokenField label="Message" value="a [Role]" onChange={() => {}} />);
    expect(screen.getByRole('img', { name: 'Role variable' })).not.toBeNull();
  });

  it('takes a custom token pattern, label and noun', () => {
    render(
      <TokenField
        label="Message"
        value="Hi {{name}}"
        onChange={() => {}}
        tokenPattern={/\{\{(\w+)\}\}/g}
        getTokenLabel={(t) => t.slice(2, -2)}
        tokenNoun="field"
      />,
    );
    expect(screen.getByRole('img', { name: 'name field' }).textContent).toBe('name');
  });

  it('wires helper and error text like Textarea', () => {
    const { rerender } = render(
      <TokenField label="Message" helperText="Use [Name]" value="" onChange={() => {}} />,
    );
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('aria-describedby')).toBe(screen.getByText('Use [Name]').id);
    rerender(
      <TokenField label="Message" error errorMessage="Too long" value="" onChange={() => {}} />,
    );
    expect(field.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Too long');
    expect(field.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('shows the placeholder only while empty', () => {
    const { rerender } = render(
      <TokenField label="Message" placeholder="Write here" value="" onChange={() => {}} />,
    );
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('aria-placeholder')).toBe('Write here');
    expect(field.hasAttribute('data-empty')).toBe(true);
    rerender(<TokenField label="Message" placeholder="Write here" value="x" onChange={() => {}} />);
    expect(field.hasAttribute('data-empty')).toBe(false);
  });

  it('disabled is not editable and leaves the tab order', () => {
    render(<TokenField label="Message" disabled value="Hi" onChange={() => {}} />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('contenteditable')).toBe('false');
    expect(field.getAttribute('aria-disabled')).toBe('true');
    expect(field.getAttribute('tabindex')).toBe('-1');
  });

  it('carries the value in a form when named', () => {
    const { container } = render(
      <TokenField label="Message" name="body" value="Hi [Name]" onChange={() => {}} />,
    );
    const input = container.querySelector<HTMLInputElement>('input[type="hidden"][name="body"]');
    expect(input?.value).toBe('Hi [Name]');
  });
});
