import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StepperField } from './stepper-field';

afterEach(cleanup);

describe('StepperField a11y', () => {
  it('pairs the visible label with the input via htmlFor/id', () => {
    const { container } = render(
      <StepperField label="Quantity" value={2} min={0} max={10} step={1} onChange={() => {}} />,
    );
    const label = container.querySelector('label') as HTMLLabelElement;
    const input = container.querySelector('input') as HTMLInputElement;
    expect(label.htmlFor).not.toBe('');
    expect(label.htmlFor).toBe(input.id);
    expect(screen.getByLabelText('Quantity')).toBe(input);
  });
});
