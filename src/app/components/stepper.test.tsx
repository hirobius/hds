import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Stepper } from './stepper';

afterEach(cleanup);

const steps = [{ label: 'Cart' }, { label: 'Shipping' }, { label: 'Payment' }, { label: 'Review' }];

describe('Stepper', () => {
  it('renders all step labels', () => {
    render(<Stepper steps={steps} activeStep={1} />);
    expect(screen.getByText('Cart')).not.toBeNull();
    expect(screen.getByText('Shipping')).not.toBeNull();
    expect(screen.getByText('Payment')).not.toBeNull();
    expect(screen.getByText('Review')).not.toBeNull();
  });

  it('marks the active step li with aria-current="step"', () => {
    const { container } = render(<Stepper steps={steps} activeStep={1} />);
    const items = container.querySelectorAll('li');
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[0].getAttribute('aria-current')).toBeNull();
  });

  it('renders a check icon and data-state="complete" for steps before activeStep', () => {
    const { container } = render(<Stepper steps={steps} activeStep={2} />);
    const items = container.querySelectorAll('li');
    expect(items[0].getAttribute('data-state')).toBe('complete');
    expect(items[1].getAttribute('data-state')).toBe('complete');
    expect(items[0].querySelector('svg')).not.toBeNull();
    expect(items[2].getAttribute('data-state')).toBe('current');
    expect(items[3].getAttribute('data-state')).toBe('upcoming');
  });

  it('reflects the orientation prop on data-orientation', () => {
    const { container } = render(<Stepper steps={steps} activeStep={0} orientation="vertical" />);
    expect(container.querySelector('ol')?.getAttribute('data-orientation')).toBe('vertical');
  });
});
