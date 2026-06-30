/**
 * Tests for the ./form RHF + Zod adapter — schema validation gates submission,
 * errors render through the presentational FormField, valid values reach onSubmit.
 * Plain-DOM assertions (no jest-dom).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { z } from 'zod';
import { useHdsForm, HdsForm, HdsFormField } from './index';

afterEach(cleanup);

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});
type Values = z.infer<typeof schema>;

function TestForm({ onValid }: { onValid: (values: Values) => void }) {
  const form = useHdsForm(schema, { defaultValues: { email: '' } });
  return (
    <HdsForm form={form} onSubmit={onValid}>
      <HdsFormField name="email" label="Email" description="We never share it.">
        {(props) => <input type="email" {...props} />}
      </HdsFormField>
      <button type="submit">Save</button>
    </HdsForm>
  );
}

describe('form adapter (useHdsForm + HdsForm + HdsFormField)', () => {
  it('binds the control to the field and renders label + helper text', () => {
    render(<TestForm onValid={() => {}} />);
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(screen.getByText('We never share it.')).not.toBeNull();
  });

  it('blocks submission and surfaces the zod error for invalid input', async () => {
    const onValid = vi.fn();
    render(<TestForm onValid={onValid} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Enter a valid email');
    });
    expect(onValid).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Email') as HTMLInputElement).getAttribute('aria-invalid')).toBe(
      'true',
    );
  });

  it('calls onSubmit with the parsed values when valid', async () => {
    const onValid = vi.fn();
    render(<TestForm onValid={onValid} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hi@hirobius.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0][0]).toEqual({ email: 'hi@hirobius.com' });
  });
});
