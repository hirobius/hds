/**
 * hds#751 (components: error / reveal): a FormField error message eases in on
 * the productive motion token instead of popping into the layout, and fades
 * out when the error clears. Under prefers-reduced-motion the duration is zero,
 * so the message appears and leaves instantly. form.tsx carries no motion-ok
 * exemption.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => reduced.value }));

import hds from '../design-system/tokens';
import { FormField } from './form';

afterEach(() => {
  cleanup();
  reduced.value = false;
});

const src = () => readFileSync(join(__dirname, 'form.tsx'), 'utf8');
const errors = (c: HTMLElement) => [...c.querySelectorAll('[data-form-error]')] as HTMLElement[];

function Field({ error }: { error?: string }) {
  return (
    <FormField label="Email" error={error}>
      <input />
    </FormField>
  );
}

describe('FormField error reveal (hds#751)', () => {
  it('carries no motion-ok exemption', () => {
    expect(src()).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
  });

  it('times the reveal on the productive motion token', () => {
    expect(src()).toMatch(/useHdsMotion\('productive'\)/);
    expect(src()).toMatch(/AnimatePresence/);
    expect(hds.motion.productive.duration).toBeGreaterThan(0);
  });

  it('keeps the cleared message, hidden from assistive tech, while it fades out', () => {
    const { container, rerender } = render(<Field error="Required field" />);
    expect(screen.getByRole('alert').textContent).toBe('Required field');
    rerender(<Field />);
    const [leaving] = errors(container);
    expect(leaving).toBeDefined();
    expect(leaving.textContent).toBe('Required field');
    expect(leaving.getAttribute('aria-hidden')).toBe('true');
    expect(leaving.getAttribute('role')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('updates the text in place when the error changes, with no second node', () => {
    const { container, rerender } = render(<Field error="Required field" />);
    rerender(<Field error="Enter a valid email" />);
    expect(errors(container)).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid email');
  });

  it('removes the message at once under prefers-reduced-motion', async () => {
    reduced.value = true;
    const { container, rerender } = render(<Field error="Required field" />);
    rerender(<Field />);
    await waitFor(() => expect(errors(container)).toHaveLength(0));
  });
});
